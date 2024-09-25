import { AVERAGE_BLOCKS_PER_10_MINUTES } from './core/constants/AVERAGE_BLOCKS_PER_10_MINS'
import { Chain } from './core/constants/chains'
import { logger } from './core/utils/logger'
import { IProtocolAdapter } from './types/IProtocolAdapter'
import { UnwrapExchangeRate, UnwrapInput } from './types/adapter'

const TEN_MINUTES_IN_MS = 10 * 60 * 1000

export interface IUnwrapCacheProvider {
  getFromDb(key: string): Promise<UnwrapExchangeRate | undefined>
  setToDb(key: string, value: UnwrapExchangeRate): Promise<void>
}

export interface IUnwrapCache {
  fetchWithCache(
    adapter: IProtocolAdapter,
    input: UnwrapInput,
  ): Promise<UnwrapExchangeRate>
}

export class UnwrapCache implements IUnwrapCache {
  constructor(private readonly unwrapCacheProvider?: IUnwrapCacheProvider) {}

  async fetchWithCache(
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
