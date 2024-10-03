import Database, { Database as DbType } from 'better-sqlite3'
import { Protocol } from './adapters/protocols'
import { Chain } from './core/constants/chains'
import { ProtocolToken } from './types/IProtocolAdapter'

export type IMetadataProvider = {
  getMetadata: (input: {
    chainId: Chain
    protocolId: Protocol
    productId: string
  }) => Promise<ProtocolToken[]>

  getPoolCount: (protocolId: string, productId: string) => Promise<number>
}

export type PoolRow = {
  pool_id: number
  pool_address: string
  adapter_pool_id?: string
  pool_additional_data?: string // JSON stored as a string
  adapter_id: number
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

export class SQLiteMetadataProvider implements IMetadataProvider {
  database: DbType

  constructor(filename: string | Buffer, options: Database.Options) {
    this.database = new Database(filename, options)

    this.database.pragma('journal_mode = DELETE')
  }

  getMetadata(input: {
    chainId: Chain
    protocolId: Protocol
    productId: string
  }): Promise<ProtocolToken[]> {
    return this.getPoolsFromDb(input)
  }

  async getPoolCount(protocolId: string, productId: string): Promise<number> {
    // Prepare the query to get the adapter ID and count the pools
    const query = `
      SELECT COUNT(*) AS pool_count
      FROM pools
      WHERE adapter_id = (
        SELECT adapter_id FROM adapters WHERE protocol_id = ? AND product_id = ?
      );
    `

    // Execute the query with the provided protocolId and productId
    const stmt = this.database.prepare(query)
    const result = stmt.get(protocolId, productId) as { pool_count?: number }

    // Return the pool count from the result
    return Number(result.pool_count ?? 0)
  }

  private readonly selectProtocolPoolsQuery = `
      SELECT 
          p.pool_id AS pool_id,
          p.pool_address AS pool_address,
          p.adapter_pool_id AS adapter_pool_id,
          p.additional_data AS pool_additional_data,
          p.adapter_id AS adapter_id,
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
      FROM pools p
      JOIN tokens t ON p.pool_address = t.token_address
      LEFT JOIN underlying_tokens ut ON p.pool_id = ut.pool_id
      LEFT JOIN tokens ut_t ON ut.token_address = ut_t.token_address
      LEFT JOIN reward_tokens rt ON p.pool_id = rt.pool_id
      LEFT JOIN tokens rt_t ON rt.token_address = rt_t.token_address
      LEFT JOIN extra_reward_tokens ert ON p.pool_id = ert.pool_id
      LEFT JOIN tokens ert_t ON ert.token_address = ert_t.token_address
      WHERE p.adapter_id = (
          SELECT adapter_id FROM adapters WHERE protocol_id = ? AND product_id = ?
      );
    `

  private async getPoolsFromDb({
    protocolId,
    productId,
    chainId,
  }: {
    protocolId: Protocol
    productId: string
    chainId: Chain
  }): Promise<ProtocolToken[]> {
    return this.selectProtocolPools(this.database, protocolId, productId)
  }

  private selectProtocolPools(
    db: DbType,
    protocolId: string,
    productId: string,
  ) {
    const query = this.selectProtocolPoolsQuery

    const rows = db.prepare(query).all(protocolId, productId) as PoolRow[]

    return this.formatDbResponse(rows)
  }

  private formatDbResponse(rows: PoolRow[]) {
    const poolsMap: Record<string, ProtocolToken> = {}

    for (const row of rows as PoolRow[]) {
      const poolId = row.pool_id

      if (!poolsMap[poolId]) {
        // Parse pool_additional_data if it exists
        const poolAdditionalData = row.pool_additional_data
          ? JSON.parse(row.pool_additional_data)
          : {}

        poolsMap[poolId] = {
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

        // IProtocolTokenType needs updating to include rewardTokens
        //@ts-ignore
        if (!pool.rewardTokens) {
          //@ts-ignore
          pool.rewardTokens = []
        }

        //@ts-ignore
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

        // IProtocolTokenType needs updating to include rewardTokens
        //@ts-ignore
        if (!pool.extraRewardTokens) {
          //@ts-ignore
          pool.extraRewardTokens = []
        }

        //@ts-ignore
        pool.extraRewardTokens.push({
          address: row.extra_reward_token_address,
          name: row.extra_reward_token_name,
          symbol: row.extra_reward_token_symbol,
          decimals: row.extra_reward_token_decimals,
          ...extraRewardAdditionalData, // Spread parsed JSON
        })
      }
    }

    return Object.values(poolsMap)
  }
}
