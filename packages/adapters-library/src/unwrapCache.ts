import type {
  IPricesAdapter,
  PricesInput,
} from './adapters/prices-v2/products/usd/pricesV2UsdAdapter.js'
import { AVERAGE_BLOCKS_PER_10_MINUTES } from './core/constants/AVERAGE_BLOCKS_PER_10_MINS.js'
import type { Chain } from './core/constants/chains.js'
import { logger } from './core/utils/logger.js'
import type { IProtocolAdapter } from './types/IProtocolAdapter.js'
import type { UnwrapExchangeRate, UnwrapInput } from './types/adapter.js'

const TEN_MINUTES_IN_MS = 10 * 60 * 1000

export interface IUnwrapPriceCacheProvider {
  getFromDb(key: string): Promise<UnwrapExchangeRate | undefined>
  setToDb(key: string, value: UnwrapExchangeRate): Promise<void>
}

export interface IUnwrapPriceCache {
  fetchUnwrapWithCache(
    adapter: IProtocolAdapter,
    input: UnwrapInput,
  ): Promise<UnwrapExchangeRate>
  fetchPriceWithCache(
    adapter: IPricesAdapter,
    input: PricesInput,
  ): Promise<UnwrapExchangeRate>
}

export class UnwrapPriceCache implements IUnwrapPriceCache {
  constructor(
    private readonly unwrapCacheProvider?: IUnwrapPriceCacheProvider,
  ) {}

  async fetchUnwrapWithCache(
    adapter: IProtocolAdapter,
    input: UnwrapInput,
  ): Promise<UnwrapExchangeRate> {
    if (!this.unwrapCacheProvider) {
      return adapter.unwrap(input)
    }

    const chainId = adapter.chainId
    const key = `${chainId}:${
      input.protocolTokenAddress
    }:${getTenMinuteKeyByBlock(input.blockNumber, chainId)}`

    const dbValue = await this.unwrapCacheProvider.getFromDb(key)

    if (dbValue) {
      logger.debug({ key }, 'Unwrap cache hit')
      return dbValue
    }

    logger.debug({ key }, 'Unwrap cache miss')

    const value = await adapter.unwrap(input)

    await this.unwrapCacheProvider.setToDb(key, value)

    return value
  }
  async fetchPriceWithCache(
    adapter: IPricesAdapter,
    input: PricesInput,
  ): Promise<UnwrapExchangeRate> {
    if (!this.unwrapCacheProvider) {
      return adapter.getPrice(input)
    }

    const chainId = adapter.chainId
    const key = `${chainId}:${
      input.tokenMetadata.address
    }:${getTenMinuteKeyByBlock(input.blockNumber, chainId)}`

    const dbValue = await this.unwrapCacheProvider.getFromDb(key)

    if (dbValue) {
      logger.debug({ key }, 'Price cache hit')
      return dbValue
    }

    logger.debug({ key }, 'Price cache miss')

    const value = await adapter.getPrice(input)

    await this.unwrapCacheProvider.setToDb(key, value)

    return value
  }
}

export function getTenMinuteKeyByBlock(
  blockNumber: number | undefined,
  chainId: Chain,
): string {
  if (!blockNumber) {
    const timestampKey = roundDownToNearestMultiple(
      Date.now(),
      TEN_MINUTES_IN_MS,
    )

    return `T${timestampKey}`
  }

  const blockKey = roundDownToNearestMultiple(
    blockNumber,
    AVERAGE_BLOCKS_PER_10_MINUTES[chainId],
  )

  return `B${blockKey}`
}

function roundDownToNearestMultiple(value: number, multiple: number): number {
  return Math.floor(value / multiple) * multiple
}
