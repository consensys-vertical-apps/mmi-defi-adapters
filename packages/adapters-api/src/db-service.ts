import { ChainName, EvmChain } from '@metamask-institutional/defi-adapters'
import pg from 'pg'

export type BlocksStats = {
  latestBlockProcessed: number | undefined
  latestBlockNumber: number | undefined
  laggingBlocks: number | undefined
}

export type JobsStats = {
  pending: number
  failed: number
  completed: number
}

export type FailedJobs = {
  contractAddress: string
  topic0: string
  userAddressIndex: number
  blockNumber: number
}

export type LogsStats = {
  totalLogs: number
  totalAddresses: number
  totalPools: number
}

export type TableSizesStats = {
  tableName: string
  totalSize: string
  tableSize: string
  indexSize: string
}[]

export interface DbService {
  getAddressPools: (
    userAddress: string,
  ) => Promise<Partial<Record<EvmChain, string[]>>>
  getAddressChainPools: (
    userAddress: string,
    chainId: EvmChain,
  ) => Promise<{
    contractAddresses: string[]
    tokenIds: Record<string, string[]>
  }>
  getAddressChainPoolsWithMetadata: (
    userAddress: string,
    chainId: EvmChain,
  ) => Promise<{
    contractAddresses: string[]
    tokenIds: Record<string, string[]>
  }>
  getBlocksStats: (
    getLatestBlockNumber: (chainId: EvmChain) => Promise<number | undefined>,
  ) => Promise<Partial<Record<EvmChain, BlocksStats>>>
  getJobsStats: () => Promise<Partial<Record<EvmChain, JobsStats>>>
  getFailedJobs: () => Promise<Partial<Record<EvmChain, FailedJobs[]>>>
  getLogsStats: () => Promise<Partial<Record<EvmChain, LogsStats>>>
  getTableSizesStats: () => Promise<Partial<Record<EvmChain, TableSizesStats>>>
}

export class PostgresService implements DbService {
  readonly #dbPools: Record<EvmChain, pg.Pool>

  constructor(dbPools: Record<EvmChain, pg.Pool>) {
    this.#dbPools = dbPools
  }

  async getAddressPools(
    userAddress: string,
  ): Promise<Partial<Record<EvmChain, string[]>>> {
    return Object.values(EvmChain).reduce(
      async (acc, chainId) => {
        const pools = await this.getAddressChainPools(userAddress, chainId)
        ;(await acc)[chainId] = pools.contractAddresses
        return acc
      },
      {} as Promise<Partial<Record<EvmChain, string[]>>>,
    )
  }

  async getAddressChainPools(
    userAddress: string,
    chainId: EvmChain,
  ): Promise<{
    contractAddresses: string[]
    tokenIds: Record<string, string[]>
  }> {
    const res = await this.#dbPools[chainId].query(
      `SELECT DISTINCT contract_address as "contractAddress", metadata_key, metadata_value
         FROM logs
         WHERE address = $1`,
      [userAddress],
    )

    const contractAddresses = new Set<string>()
    const tokenIds: Record<string, string[]> = {}

    for (const row of res.rows) {
      const { contractAddress, metadata_key, metadata_value } = row
      contractAddresses.add(contractAddress)

      if (metadata_key && metadata_value) {
        if (!tokenIds[contractAddress]) {
          tokenIds[contractAddress] = []
        }
        tokenIds[contractAddress].push(metadata_value)
      }
    }

    return {
      contractAddresses: Array.from(contractAddresses),
      tokenIds,
    }
  }

  async getAddressChainPoolsWithMetadata(
    userAddress: string,
    chainId: EvmChain,
  ): Promise<{
    contractAddresses: string[]
    tokenIds: Record<string, string[]>
  }> {
    const res = await this.#dbPools[chainId].query(
      `SELECT DISTINCT contract_address as "contractAddress", metadata_key, metadata_value
         FROM logs
         WHERE address = $1`,
      [userAddress],
    )

    const contractAddresses = new Set<string>()
    const tokenIds: Record<string, string[]> = {}

    for (const row of res.rows) {
      const { contractAddress, metadata_key, metadata_value } = row
      contractAddresses.add(contractAddress)

      if (metadata_key && metadata_value) {
        if (!tokenIds[contractAddress]) {
          tokenIds[contractAddress] = []
        }
        tokenIds[contractAddress].push(metadata_value)
      }
    }

    return {
      contractAddresses: Array.from(contractAddresses),
      tokenIds,
    }
  }

  async getBlocksStats(
    getLatestBlockNumber: (chainId: EvmChain) => Promise<number | undefined>,
  ): Promise<Partial<Record<EvmChain, BlocksStats>>> {
    const blocksStats = async (chainId: EvmChain) => {
      const dbPool = this.#dbPools[chainId]

      const [queryResult, latestBlockNumber] = await Promise.all([
        dbPool.query('SELECT value FROM settings WHERE key = $1', [
          'latest_block_processed',
        ]),
        getLatestBlockNumber(chainId),
      ])

      const latestBlockProcessed = queryResult.rows[0]?.value
        ? Number.parseInt(queryResult.rows[0].value)
        : undefined

      return {
        latestBlockProcessed,
        latestBlockNumber,
        laggingBlocks:
          latestBlockNumber && latestBlockProcessed
            ? latestBlockNumber - latestBlockProcessed
            : undefined,
      }
    }

    return await this.#runStatsForAllChains(blocksStats)
  }

  async getJobsStats(): Promise<Partial<Record<EvmChain, JobsStats>>> {
    const jobsStats = async (chainId: EvmChain) => {
      const dbPool = this.#dbPools[chainId]
      const queryResult = await dbPool.query(
        'SELECT status, COUNT(*) as "total" FROM jobs GROUP BY status',
      )

      return (['pending', 'failed', 'completed'] as const).reduce(
        (acc, curr) => {
          const total = queryResult.rows.find(
            (row) => row.status === curr,
          )?.total
          acc[curr] = total ? Number(total) : 0
          return acc
        },
        {} as JobsStats,
      )
    }

    return await this.#runStatsForAllChains(jobsStats)
  }

  async getFailedJobs(): Promise<Partial<Record<EvmChain, FailedJobs[]>>> {
    const failedJobs = async (chainId: EvmChain) => {
      const dbPool = this.#dbPools[chainId]
      const queryResult = await dbPool.query(
        `SELECT contract_address as "contractAddress",
                topic_0 as "topic0",
                user_address_index as "userAddressIndex",
                block_number as "blockNumber"
         FROM jobs
         WHERE status = $1`,
        ['failed'],
      )
      return queryResult.rows as FailedJobs[]
    }

    return await this.#runStatsForAllChains(failedJobs)
  }

  async getLogsStats(): Promise<Partial<Record<EvmChain, LogsStats>>> {
    const logsStats = async (chainId: EvmChain) => {
      const dbPool = this.#dbPools[chainId]
      const queryResult = await dbPool.query(
        `SELECT COUNT(*) as "totalLogs",
                COUNT(DISTINCT address) as "totalAddresses",
                COUNT(DISTINCT contract_address) as "totalPools"
         FROM logs`,
      )

      return queryResult.rows[0] as {
        totalLogs: number
        totalAddresses: number
        totalPools: number
      }
    }

    return await this.#runStatsForAllChains(logsStats)
  }

  async getTableSizesStats(): Promise<
    Partial<Record<EvmChain, TableSizesStats>>
  > {
    const tableSizesStats = async (chainId: EvmChain) => {
      const dbPool = this.#dbPools[chainId]
      const queryResult = await dbPool.query(
        `SELECT tablename as "tableName",
                pg_size_pretty(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))) as "totalSize",
                pg_size_pretty(pg_table_size(quote_ident(schemaname) || '.' || quote_ident(tablename))) as "tableSize",
                pg_size_pretty(pg_indexes_size(quote_ident(schemaname) || '.' || quote_ident(tablename))) as "indexSize"
         FROM pg_tables
         WHERE schemaname = $1
         ORDER BY pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename)) DESC;`,
        [ChainName[chainId]],
      )

      return queryResult.rows as {
        tableName: string
        totalSize: string
        tableSize: string
        indexSize: string
      }[]
    }

    return await this.#runStatsForAllChains(tableSizesStats)
  }

  async #runStatsForAllChains<T>(getStats: (chainId: EvmChain) => Promise<T>) {
    const chainJobsStats = await Promise.all(
      Object.values(EvmChain).map(async (chainId) => ({
        chainId,
        stats: await getStats(chainId),
      })),
    )

    return chainJobsStats.reduce(
      (acc, curr) => {
        acc[curr.chainId] = curr.stats
        return acc
      },
      {} as Partial<Record<EvmChain, T>>,
    )
  }
}

export class NoDbService implements DbService {
  getAddressPools(): Promise<Partial<Record<EvmChain, string[]>>> {
    throw new Error('Not Implemented')
  }
  getAddressChainPools(): Promise<{
    contractAddresses: string[]
    tokenIds: Record<string, string[]>
  }> {
    throw new Error('Not Implemented')
  }
  getAddressChainPoolsWithMetadata(): Promise<{
    contractAddresses: string[]
    tokenIds: Record<string, string[]>
  }> {
    throw new Error('Not Implemented')
  }
  getBlocksStats(): Promise<Partial<Record<EvmChain, BlocksStats>>> {
    throw new Error('Not Implemented')
  }
  getJobsStats(): Promise<Partial<Record<EvmChain, JobsStats>>> {
    throw new Error('Not Implemented')
  }
  getFailedJobs(): Promise<Partial<Record<EvmChain, FailedJobs[]>>> {
    throw new Error('Not Implemented')
  }
  getLogsStats(): Promise<Partial<Record<EvmChain, LogsStats>>> {
    throw new Error('Not Implemented')
  }
  getTableSizesStats(): Promise<Partial<Record<EvmChain, TableSizesStats>>> {
    throw new Error('Not Implemented')
  }
}
