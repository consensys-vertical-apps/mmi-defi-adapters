import { existsSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import type { Protocol } from './adapters/protocols.js'
import { Chain, ChainIdToChainNameMap } from './core/constants/chains.js'
import { logger } from './core/utils/logger.js'
import type {
  AdditionalMetadataWithReservedFields,
  ProtocolToken,
} from './types/IProtocolAdapter.js'

export type IMetadataProvider = {
  getMetadata: (input: {
    protocolId: Protocol
    productId: string
  }) => Promise<ProtocolToken[]>

  getPoolCount: (protocolId: Protocol, productId: string) => Promise<number>
}

export type PoolRow = {
  protocol_id: string
  product_id: string
  pool_id: number | bigint | undefined
  adapter_pool_id?: string
  pool_additional_data?: string // JSON stored as a string
  main_token_address: string
  main_token_name: string
  main_token_symbol: string
  main_token_decimals: number
  underlying_token_address?: string
  underlying_token_name?: string
  underlying_token_symbol?: string
  underlying_token_decimals?: number
  underlying_additional_data?: string // JSON stored as a string
  reward_token_address?: string
  reward_token_name?: string
  reward_token_symbol?: string
  reward_token_decimals?: number
  reward_additional_data?: string // JSON stored as a string
  extra_reward_token_address?: string
  extra_reward_token_name?: string
  extra_reward_token_symbol?: string
  extra_reward_token_decimals?: number
  extra_reward_additional_data?: string // JSON stored as a string
}

const selectAllPoolsQuery = `
  SELECT 
    a.protocol_id,
    a.product_id,
    p.pool_id,
    p.adapter_pool_id,
    p.additional_data AS pool_additional_data,
    t.token_address AS main_token_address,
    t.token_name AS main_token_name,
    t.token_symbol AS main_token_symbol,
    t.token_decimals AS main_token_decimals,
    ut.token_address AS underlying_token_address,
    ut_t.token_name AS underlying_token_name,
    ut_t.token_symbol AS underlying_token_symbol,
    ut_t.token_decimals AS underlying_token_decimals,
    ut.additional_data AS underlying_additional_data,
    rt.token_address AS reward_token_address,
    rt_t.token_name AS reward_token_name,
    rt_t.token_symbol AS reward_token_symbol,
    rt_t.token_decimals AS reward_token_decimals,
    rt.additional_data AS reward_additional_data,
    ert.token_address AS extra_reward_token_address,
    ert_t.token_name AS extra_reward_token_name,
    ert_t.token_symbol AS extra_reward_token_symbol,
    ert_t.token_decimals AS extra_reward_token_decimals,
    ert.additional_data AS extra_reward_additional_data
  FROM  adapters a 
        LEFT JOIN pools p ON a.adapter_id = p.adapter_id
        LEFT JOIN tokens t ON p.pool_address = t.token_address
        LEFT JOIN underlying_tokens ut ON p.pool_id = ut.pool_id
        LEFT JOIN tokens ut_t ON ut.token_address = ut_t.token_address
        LEFT JOIN reward_tokens rt ON p.pool_id = rt.pool_id
        LEFT JOIN tokens rt_t ON rt.token_address = rt_t.token_address
        LEFT JOIN extra_reward_tokens ert ON p.pool_id = ert.pool_id
        LEFT JOIN tokens ert_t ON ert.token_address = ert_t.token_address;
`

export class SQLiteMetadataProvider implements IMetadataProvider {
  database: Database.Database

  allTokens: Promise<Map<string, ProtocolToken[]>>

  constructor(filename: string | Buffer, options: Database.Options) {
    this.database = new Database(filename, options)

    this.allTokens = new Promise<Map<string, ProtocolToken[]>>(
      (resolve, reject) => {
        try {
          const allRows = this.database
            .prepare(selectAllPoolsQuery)
            .all() as PoolRow[]

          resolve(this.formatDbResponse(allRows))
        } catch (error) {
          logger.error({ filename, options }, 'Error fetching database rows')
          reject(error)
        }
      },
    )
  }

  async getMetadata({
    protocolId,
    productId,
  }: {
    protocolId: Protocol
    productId: string
  }): Promise<ProtocolToken[]> {
    const adapterTokens = (await this.allTokens).get(
      this.adapterKey(protocolId, productId),
    )

    return adapterTokens ?? []
  }

  async getPoolCount(protocolId: Protocol, productId: string): Promise<number> {
    return (await this.getMetadata({ protocolId, productId })).length
  }

  private formatDbResponse(rows: PoolRow[]): Map<string, ProtocolToken[]> {
    const poolsMap: Record<
      string,
      ProtocolToken<AdditionalMetadataWithReservedFields> & {
        adapterKey: string
      }
    > = {}
    const adaptersMap = new Map<string, ProtocolToken[]>()

    for (const row of rows as PoolRow[]) {
      const adapterKey = this.adapterKey(row.protocol_id, row.product_id)

      if (!adaptersMap.has(adapterKey)) {
        adaptersMap.set(adapterKey, [])
      }

      if (!row.pool_id) {
        continue
      }

      const poolId = row.pool_id.toString()

      if (!poolsMap[poolId]) {
        // Parse pool_additional_data if it exists
        const poolAdditionalData = row.pool_additional_data
          ? JSON.parse(row.pool_additional_data)
          : {}

        poolsMap[poolId] = {
          adapterKey,
          address: row.main_token_address,
          name: row.main_token_name,
          symbol: row.main_token_symbol,
          decimals: row.main_token_decimals,
          tokenId:
            row.adapter_pool_id === null ? undefined : row.adapter_pool_id,
          ...poolAdditionalData, // Spread parsed JSON
          underlyingTokens: [], // This one seems to always be populated
        }
      }

      const pool = poolsMap[poolId]!

      // Handle underlyingTokens
      if (row.underlying_token_address) {
        const underlyingAdditionalData = row.underlying_additional_data
          ? JSON.parse(row.underlying_additional_data)
          : {}

        pool.underlyingTokens!.push({
          address: row.underlying_token_address,
          name: row.underlying_token_name,
          symbol: row.underlying_token_symbol,
          decimals: row.underlying_token_decimals,
          ...underlyingAdditionalData, // Spread parsed JSON
        })
      }

      // Handle rewardTokens only if it exists
      if (row.reward_token_address) {
        const rewardAdditionalData = row.reward_additional_data
          ? JSON.parse(row.reward_additional_data)
          : {}

        if (!pool.rewardTokens) {
          pool.rewardTokens = []
        }

        pool.rewardTokens.push({
          address: row.reward_token_address,
          name: row.reward_token_name,
          symbol: row.reward_token_symbol,
          decimals: row.reward_token_decimals,
          ...rewardAdditionalData, // Spread parsed JSON
        })
      }

      // Handle extraRewardTokens only if it exists
      if (row.extra_reward_token_address) {
        const extraRewardAdditionalData = row.extra_reward_additional_data
          ? JSON.parse(row.extra_reward_additional_data)
          : {}

        if (!pool.extraRewardTokens) {
          pool.extraRewardTokens = []
        }

        pool.extraRewardTokens.push({
          address: row.extra_reward_token_address,
          name: row.extra_reward_token_name,
          symbol: row.extra_reward_token_symbol,
          decimals: row.extra_reward_token_decimals,
          ...extraRewardAdditionalData, // Spread parsed JSON
        })
      }
    }

    Object.values(poolsMap).forEach(({ adapterKey, ...pool }) => {
      adaptersMap.get(adapterKey)!.push(pool)
    })

    return adaptersMap
  }

  private adapterKey(protocolId: string, productId: string) {
    return `${protocolId}#${productId}`
  }
}

export function buildSqliteMetadataProviders(
  metadataProviderSettings:
    | Record<Chain, { dbPath: string; options: Database.Options }>
    | undefined = defaultMetadataProviderSettings(),
): Record<Chain, IMetadataProvider> {
  return Object.entries(metadataProviderSettings).reduce(
    (acc, [chainId, { dbPath, options }]) => {
      if (options.fileMustExist && !existsSync(dbPath)) {
        logger.info(`Database file does not exist: ${dbPath}`)
        throw new Error(`Database file does not exist: ${dbPath}`)
      }

      logger.debug(`Database file exists: ${dbPath}`)

      acc[+chainId as Chain] = new SQLiteMetadataProvider(dbPath, options)
      return acc
    },
    {} as Record<Chain, IMetadataProvider>,
  )
}

function defaultMetadataProviderSettings() {
  const allowDbCreation = process.env.DEFI_ALLOW_DB_CREATION !== 'false'

  return Object.values(Chain).reduce(
    (chainMetadataProvider, chainId) => {
      chainMetadataProvider[chainId] = {
        dbPath: path.resolve(`${ChainIdToChainNameMap[chainId]}.db`),
        options: { fileMustExist: !allowDbCreation },
      }

      return chainMetadataProvider
    },
    {} as Record<
      Chain,
      {
        dbPath: string
        options: Database.Options
      }
    >,
  )
}
