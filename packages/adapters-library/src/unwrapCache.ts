import { AVERAGE_BLOCKS_PER_10_MINUTES } from './core/constants/AVERAGE_BLOCKS_PER_10_MINS'
import { Chain } from './core/constants/chains'
import { logger } from './core/utils/logger'
import { UnwrapExchangeRate, UnwrapInput } from './types/adapter'

const TEN_MINUTES_IN_MS = 10 * 60 * 1000

export abstract class UnwrapCache {
  async fetchWithCache(
    input: UnwrapInput,
    chainId: Chain,
    dataFetcher: (input: UnwrapInput) => Promise<UnwrapExchangeRate>,
  ): Promise<UnwrapExchangeRate> {
    const key = `${chainId}:${input.protocolTokenAddress}:${this.getKey(
      input.blockNumber,
      chainId,
    )}`

    const dbValue = await this.getFromDb(key)

    if (dbValue) {
      logger.warn({ key }, 'Cache hit')
      return dbValue
    }

    logger.warn({ key }, 'Cache miss')

    const value = await dataFetcher(input)

    await this.setToDb(key, value)

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

  protected abstract getFromDb(
    key: string,
  ): Promise<UnwrapExchangeRate | undefined>

  protected abstract setToDb(
    key: string,
    value: UnwrapExchangeRate,
  ): Promise<void>
}

export class MemoryUnwrapCache extends UnwrapCache {
  private cache: Record<string, UnwrapExchangeRate> = {}

  protected async getFromDb(
    key: string,
  ): Promise<UnwrapExchangeRate | undefined> {
    return this.cache[key]
  }

  protected async setToDb(
    key: string,
    value: UnwrapExchangeRate,
  ): Promise<void> {
    this.cache[key] = value
  }
}
