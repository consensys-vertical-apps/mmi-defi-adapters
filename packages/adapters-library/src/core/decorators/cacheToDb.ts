import { promises as fs } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { IProtocolAdapter, ProtocolToken } from '../../types/IProtocolAdapter'
import { Chain, ChainName } from '../constants/chains'
import { logger } from '../utils/logger'

import { Protocol } from '../../adapters/protocols'

export function CacheToDb() {
  return function actualDecorator(
    // biome-ignore lint/suspicious/noExplicitAny: Decorator code
    originalMethod: any,
    _context: ClassMethodDecoratorContext,
  ) {
    async function replacementMethod(
      this: IProtocolAdapter,
      ...args: unknown[]
    ) {
      const writeToDb = args[0] as boolean
      if (writeToDb) {
        logger.info(
          {
            protocolId: this.protocolId,
            productId: this.productId,
            chainId: this.chainId,
          },
          'Write to database',
        )
        const metadataObject = await originalMethod.call(this, ...args)

        return {
          metadata: metadataObject,
          adapterDetails: {
            protocolId: this.protocolId,
            productId: this.productId,
            chainId: this.chainId,
          },
          // biome-ignore lint/suspicious/noExplicitAny: Decorator code
        } as any
      }

      const metadata = await getPoolsFromDb({
        protocolId: this.protocolId,
        productId: this.productId,
        chainId: this.chainId,
      })

      if (!metadata) {
        logger.error(
          {
            protocolId: this.protocolId,
            productId: this.productId,
            chainId: this.chainId,
          },
          'Metadata not found in db',
        )
        throw new Error('Metadata not found in db')
      }

      return metadata
    }
    // Mark the method as decorated with CacheToDb
    replacementMethod.isCacheToDbDecorated = true
    return replacementMethod
  }
}

async function getPoolsFromDb({
  protocolId,
  productId,
  chainId,
}: {
  protocolId: Protocol
  productId: string
  chainId: Chain
}): Promise<ProtocolToken[]> {
  const name = ChainName[chainId]
  const dbPath = path.join(__dirname, '../../../../..', `${name}.db`)

  try {
    await fs.access(dbPath)
    logger.info(`Database file already exists: ${dbPath}`)
  } catch {
    logger.info(`Database file does not exist: ${dbPath}`)
    throw `Database file does not exist: ${dbPath}`
  }

  const db = new Database(dbPath)

  const query = `
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

  const rows = db.prepare(query).all(protocolId, productId)

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
        tokenId: row.adapter_pool_id,
        ...poolAdditionalData, // Spread parsed JSON
        underlyingTokens: [],
        rewardTokens: [],
        extraRewardTokens: [],
      }
    }

    const pool = poolsMap[poolId]!

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

    if (row.reward_token_address) {
      const rewardAdditionalData = row.reward_additional_data
        ? JSON.parse(row.reward_additional_data)
        : {}

      //@ts-ignore
      pool.rewardTokens!.push({
        address: row.reward_token_address,
        name: row.reward_token_name,
        symbol: row.reward_token_symbol,
        decimals: row.reward_token_decimals,
        ...rewardAdditionalData, // Spread parsed JSON
      })
    }

    if (row.extra_reward_token_address) {
      const extraRewardAdditionalData = row.extra_reward_additional_data
        ? JSON.parse(row.extra_reward_additional_data)
        : {}

      //@ts-ignore
      pool.extraRewardTokens!.push({
        address: row.extra_reward_token_address,
        name: row.extra_reward_token_name,
        symbol: row.extra_reward_token_symbol,
        decimals: row.extra_reward_token_decimals,
        ...extraRewardAdditionalData, // Spread parsed JSON
      })
    }
  }

  db.close()

  return Object.values(poolsMap)
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
