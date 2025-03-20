import { ChainName, type EvmChain } from '@metamask-institutional/defi-adapters'
import { Mutex } from 'async-mutex'
import type { Pool, PoolClient, PoolConfig } from 'pg'
import { logger } from './logger.js'
import { createDbPool } from './postgres-utils.js'

export type JobDbEntry = {
  contractAddress: string
  topic0: string
  userAddressIndex: number
  blockNumber: number
  status: 'pending' | 'failed' | 'completed'
}

export interface CacheClient {
  migrate: () => Promise<void>

  getLatestBlockProcessed: () => Promise<number | undefined>
  updateLatestBlockProcessed: (blockNumber: number) => Promise<void>

  fetchAllJobs: () => Promise<JobDbEntry[]>
  fetchUnfinishedJobs: () => Promise<
    (Omit<JobDbEntry, 'status'> & { status: 'pending' | 'failed' })[]
  >
  insertJobs: (
    protocolTokenEntries: {
      address: string
      topic0: string
      userAddressIndex: number
    }[],
    blockNumber: number,
  ) => Promise<void>
  updateJobStatus: (
    contractAddresses: string[],
    topic0: string,
    userAddressIndex: number,
    status: 'completed' | 'failed',
  ) => Promise<void>

  insertLogs: (
    logs: {
      address: string
      contractAddress: string
    }[],
    blockNumber?: number,
  ) => Promise<void>
}

export async function createPostgresCacheClient({
  dbUrl,
  chainId,
  partialPoolConfig,
}: {
  dbUrl: string
  chainId: EvmChain
  partialPoolConfig?: Omit<PoolConfig, 'connectionString'>
}): Promise<CacheClient> {
  const schema = ChainName[chainId]

  const dbPool = createDbPool({
    dbUrl,
    schema,
    logger,
    partialPoolConfig,
  })

  await dbPool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)

  const client = new PostgresCacheClient(dbPool, chainId)
  await client.migrate()

  return client
}

class PostgresCacheClient implements CacheClient {
  readonly #dbPool: Pool
  readonly #chainId: EvmChain
  readonly #logsMutex: Mutex
  readonly #jobsMutex: Mutex

  constructor(dbPool: Pool, chainId: EvmChain) {
    this.#dbPool = dbPool
    this.#chainId = chainId
    this.#logsMutex = new Mutex()
    this.#jobsMutex = new Mutex()
  }

  async migrate() {
    // TODO Run migrations instead of creating the tables here
    await this.#bulkTransaction(async (client) => {
      await client.query(
        `CREATE TABLE IF NOT EXISTS logs (
           address TEXT NOT NULL,
           contract_address TEXT NOT NULL,
           PRIMARY KEY (address, contract_address)
         )`,
      )

      await client.query(
        `CREATE TABLE IF NOT EXISTS jobs (
           contract_address TEXT NOT NULL,
           topic_0 TEXT NOT NULL,
           user_address_index INTEGER NOT NULL CHECK (user_address_index IN (1, 2, 3)),
           block_number INTEGER NOT NULL,
           status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
           PRIMARY KEY (contract_address, topic_0, user_address_index)
         )`,
      )

      await client.query(
        `CREATE TABLE IF NOT EXISTS settings (
           key TEXT PRIMARY KEY,
           value TEXT
         )`,
      )

      await client.query(
        `INSERT INTO settings (key, value)
         VALUES ('latest_block_processed', NULL)
         ON CONFLICT DO NOTHING`,
      )
    })
  }

  async getLatestBlockProcessed(): Promise<number | undefined> {
    const res = await this.#dbPool.query(
      'SELECT value FROM settings WHERE key = $1',
      ['latest_block_processed'],
    )

    const value = res.rows[0]?.value

    return value ? Number.parseInt(value) : undefined
  }

  async updateLatestBlockProcessed(blockNumber: number) {
    await this.#dbPool.query('UPDATE settings SET value = $1 WHERE key = $2', [
      blockNumber.toString(),
      'latest_block_processed',
    ])
  }

  async fetchAllJobs() {
    const res = await this.#dbPool.query(
      `SELECT contract_address as "contractAddress",
              topic_0 as "topic0",
              user_address_index as "userAddressIndex",
              block_number as "blockNumber",
              status
       FROM jobs`,
    )

    return res.rows as JobDbEntry[]
  }

  async fetchUnfinishedJobs() {
    const res = await this.#dbPool.query(
      `SELECT contract_address as "contractAddress",
              topic_0 as "topic0",
              user_address_index as "userAddressIndex",
              block_number as "blockNumber",
              status
       FROM jobs
       WHERE status <> $1`,
      ['completed'],
    )

    return res.rows as (Omit<JobDbEntry, 'status'> & {
      status: 'pending' | 'failed'
    })[]
  }

  async insertJobs(
    protocolTokenEntries: {
      address: string
      topic0: string
      userAddressIndex: number
    }[],
    blockNumber: number,
  ) {
    const release = await this.#jobsMutex.acquire()

    await this.#bulkTransaction(async (client) => {
      for (const entry of protocolTokenEntries) {
        await client.query(
          `INSERT INTO jobs (contract_address, topic_0, user_address_index, block_number)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [entry.address, entry.topic0, entry.userAddressIndex, blockNumber],
        )
      }
    })

    release()
  }

  async updateJobStatus(
    contractAddresses: string[],
    topic0: string,
    userAddressIndex: number,
    status: 'completed' | 'failed',
  ) {
    const release = await this.#jobsMutex.acquire()

    await this.#bulkTransaction(async (client) => {
      for (const contractAddress of contractAddresses) {
        await client.query(
          `UPDATE jobs
           SET status = $1
           WHERE contract_address = $2 AND topic_0 = $3 AND user_address_index = $4`,
          [status, contractAddress, topic0, userAddressIndex],
        )
      }
    })

    release()
  }

  async insertLogs(
    logs: {
      address: string
      contractAddress: string
    }[],
    blockNumber?: number,
  ) {
    const release = await this.#logsMutex.acquire()

    await this.#bulkTransaction(async (client) => {
      const batchSize = 1000
      for (let i = 0; i < logs.length; i += batchSize) {
        const batch = logs.slice(i, i + batchSize)
        const values = batch
          .map((_log, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`)
          .join(',')
        const params = batch.flatMap(({ address, contractAddress }) => [
          address,
          contractAddress,
        ])

        await client.query(
          `INSERT INTO logs (address, contract_address)
           VALUES ${values}
           ON CONFLICT DO NOTHING`,
          params,
        )

        logger.debug(
          {
            logs: logs.length,
            blockNumber,
          },
          'Inserted logs',
        )
      }

      if (blockNumber) {
        await this.updateLatestBlockProcessed(blockNumber)
      }
    })

    release()
  }

  /**
   * Use when there is a need to run multiple queries in a single transaction.
   */
  async #bulkTransaction<Result>(
    queries: (client: PoolClient) => Promise<Result>,
  ): Promise<Result> {
    const client = await this.#dbPool.connect()

    try {
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED')

      const result = await queries(client)

      await client.query('COMMIT')

      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}
