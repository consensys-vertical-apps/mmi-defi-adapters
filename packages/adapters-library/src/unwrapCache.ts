import { AVERAGE_BLOCKS_PER_10_MINUTES } from './core/constants/AVERAGE_BLOCKS_PER_10_MINS'
import { Chain } from './core/constants/chains'
import { logger } from './core/utils/logger'
import { UnwrapExchangeRate, UnwrapInput } from './types/adapter'

const TEN_MINUTES_IN_MS = 10 * 60 * 1000

export interface IUnwrapCacheProvider {
  getFromDb(key: string): Promise<UnwrapExchangeRate | undefined>
  setToDb(key: string, value: UnwrapExchangeRate): Promise<void>
}

export class UnwrapCache {
  constructor(private readonly unwrapCacheProvider: IUnwrapCacheProvider) {}

  async fetchWithCache(
    input: UnwrapInput,
    chainId: Chain,
    dataFetcher: (input: UnwrapInput) => Promise<UnwrapExchangeRate>,
  ): Promise<UnwrapExchangeRate> {
    const key = `${chainId}:${input.protocolTokenAddress}:${this.getKey(
      input.blockNumber,
      chainId,
    )}`

    const dbValue = await this.unwrapCacheProvider.getFromDb(key)

    if (dbValue) {
      logger.warn({ key }, 'Cache hit')
      return dbValue
    }

    logger.warn({ key }, 'Cache miss')

    const value = await dataFetcher(input)

    await this.unwrapCacheProvider.setToDb(key, value)

    return value
  }

  private getKey(blockNumber: number | undefined, chainId: Chain): string {
    if (!blockNumber) {
      const timestampKey =
        Math.floor(Date.now() / TEN_MINUTES_IN_MS) * TEN_MINUTES_IN_MS

      return `T${timestampKey}`
    }

    const blockKey =
      Math.floor(blockNumber / AVERAGE_BLOCKS_PER_10_MINUTES[chainId]) *
      AVERAGE_BLOCKS_PER_10_MINUTES[chainId]

    return `B${blockKey}`
  }
}

export class MemoryUnwrapCacheProvider implements IUnwrapCacheProvider {
  private cache: Record<string, UnwrapExchangeRate> = {}

  async getFromDb(key: string): Promise<UnwrapExchangeRate | undefined> {
    return this.cache[key]
  }

  async setToDb(key: string, value: UnwrapExchangeRate): Promise<void> {
    this.cache[key] = value
  }
}
