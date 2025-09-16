import { ChainName, type EvmChain } from '@metamask-institutional/defi-adapters'
import { type AdditionalMetadataConfig } from '@metamask-institutional/defi-adapters'
import { Mutex } from 'async-mutex'
import type { Pool, PoolClient, PoolConfig } from 'pg'
import type { Logger } from 'pino'
import { createDbPool } from './postgres-utils.js'
import { runMigrations } from './run-migrations.js'

export type JobDbEntry = {
  contractAddress: string
  topic0: `0x${string}`
  eventAbi: string | null
  userAddressIndex: number
  blockNumber: number
  status: 'pending' | 'failed' | 'completed'
  additionalMetadataArguments?: AdditionalMetadataConfig
  transformUserAddressType?: string
}

export interface CacheClient {
  getLatestBlockProcessed: () => Promise<number | undefined>
  updateLatestBlockProcessed: (blockNumber: number) => Promise<void>

  fetchAllJobs: () => Promise<JobDbEntry[]>
  fetchUnfinishedJobs: () => Promise<
    (Omit<JobDbEntry, 'status'> & { status: 'pending' | 'failed' })[]
  >
  insertJobs: (
    protocolTokenEntries: {
      contractAddress: string
      topic0: `0x${string}`
      eventAbi?: string
      userAddressIndex: number
      additionalMetadataArguments?: AdditionalMetadataConfig
    }[],
    blockNumber: number,
  ) => Promise<number>
  updateJobStatus: (
    contractAddresses: string[],
    topic0: `0x${string}`,
    userAddressIndex: number,
    status: 'completed' | 'failed',
  ) => Promise<void>

  insertLogs: (
    logs: {
      address: string
      contractAddress: string
      metadata?: Record<string, string>
    }[],
    blockNumber?: number,
  ) => Promise<number>
}

export async function createPostgresCacheClient({
  dbUrl,
  chainId,
  partialPoolConfig,
  logger,
}: {
  dbUrl: string
  chainId: EvmChain
  partialPoolConfig?: Omit<PoolConfig, 'connectionString'>
  logger: Logger
}): Promise<CacheClient> {
  const schema = ChainName[chainId]

  const dbPool = createDbPool({
    dbUrl,
    schema,
    logger,
    partialPoolConfig,
  })

  await dbPool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)

  await runMigrations(dbPool, logger)

  const client = new PostgresCacheClient(dbPool, logger)

  return client
}

class PostgresCacheClient implements CacheClient {
  readonly #dbPool: Pool
  readonly #logsMutex: Mutex
  readonly #jobsMutex: Mutex
  readonly #logger: Logger

  constructor(dbPool: Pool, logger: Logger) {
    this.#dbPool = dbPool
    this.#logsMutex = new Mutex()
    this.#jobsMutex = new Mutex()
    this.#logger = logger
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
    const res = await this.#dbPool.query<JobDbEntry>(
      `SELECT contract_address as "contractAddress",
              topic_0 as "topic0",
              event_abi as "eventAbi",
              user_address_index as "userAddressIndex",
              block_number as "blockNumber",
              status,
              additional_metadata_arguments as "additionalMetadataArguments",
              transform_user_address_type as "transformUserAddressType"
       FROM jobs`,
    )

    return res.rows
  }

  async fetchUnfinishedJobs() {
    const res = await this.#dbPool.query<
      Omit<JobDbEntry, 'status'> & {
        status: 'pending' | 'failed'
      }
    >(
      `SELECT contract_address as "contractAddress",
              topic_0 as "topic0",
              event_abi as "eventAbi",
              user_address_index as "userAddressIndex",
              block_number as "blockNumber",
              status,
              additional_metadata_arguments as "additionalMetadataArguments",
              transform_user_address_type as "transformUserAddressType"
       FROM jobs
       WHERE status <> $1`,
      ['completed'],
    )

    return res.rows
  }

  async insertJobs(
    protocolTokenEntries: {
      contractAddress: string
      topic0: `0x${string}`
      eventAbi?: string
      userAddressIndex: number
      additionalMetadataArguments?: AdditionalMetadataConfig
      transformUserAddressType?: string
    }[],
    blockNumber: number,
  ) {
    const release = await this.#jobsMutex.acquire()

    let insertedCount = 0
    await this.#bulkTransaction(async (client) => {
      for (const entry of protocolTokenEntries) {
        const result = await client.query(
          `INSERT INTO jobs (contract_address, topic_0, event_abi, user_address_index, block_number, additional_metadata_arguments, transform_user_address_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [
            entry.contractAddress,
            entry.topic0,
            entry.eventAbi,
            entry.userAddressIndex,
            blockNumber,
            entry.additionalMetadataArguments
              ? JSON.stringify(entry.additionalMetadataArguments)
              : null,
            entry.transformUserAddressType || null,
          ],
        )

        insertedCount += result.rowCount ?? 0
      }
    })

    release()

    return insertedCount
  }

  async updateJobStatus(
    contractAddresses: string[],
    topic0: `0x${string}`,
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
      metadata?: Record<string, string>
    }[],
    blockNumber?: number,
  ) {
    const release = await this.#logsMutex.acquire()

    let insertedCount = 0
    await this.#bulkTransaction(async (client) => {
      const batchSize = 1000
      for (let i = 0; i < logs.length; i += batchSize) {
        const batch = logs.slice(i, i + batchSize)

        // Process each log to extract all metadata entries
        const logEntries: Array<{
          address: string
          contractAddress: string
          metadataKey: string | null
          metadataValue: string | null
        }> = []

        for (const { address, contractAddress, metadata } of batch) {
          if (metadata && Object.keys(metadata).length > 0) {
            // Create an entry for each metadata key-value pair
            for (const [key, value] of Object.entries(metadata)) {
              logEntries.push({
                address,
                contractAddress,
                metadataKey: key,
                metadataValue: value,
              })
            }
          } else {
            // Create a single entry with null metadata for logs without metadata
            logEntries.push({
              address,
              contractAddress,
              metadataKey: null,
              metadataValue: null,
            })
          }
        }

        if (logEntries.length === 0) {
          continue
        }

        // Generate SQL values and parameters for all log entries
        const values = logEntries
          .map(
            (_, idx) =>
              `($${idx * 4 + 1}, $${idx * 4 + 2}, $${idx * 4 + 3}, $${idx * 4 + 4})`,
          )
          .join(',')
        const params = logEntries.flatMap(
          ({ address, contractAddress, metadataKey, metadataValue }) => [
            address,
            contractAddress,
            metadataKey,
            metadataValue,
          ],
        )

        const result = await client.query(
          `INSERT INTO logs (address, contract_address, metadata_key, metadata_value)
           VALUES ${values}
           ON CONFLICT (address, contract_address, metadata_key, metadata_value) DO NOTHING`,
          params,
        )

        insertedCount += result.rowCount ?? 0

        this.#logger.debug(
          {
            logs: logs.length,
            logEntries: logEntries.length,
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

    return insertedCount
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
