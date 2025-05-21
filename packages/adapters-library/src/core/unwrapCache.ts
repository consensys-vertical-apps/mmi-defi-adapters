import type {
  IPricesAdapter,
  PricesInput,
} from '../adapters/prices-v2/products/usd/pricesV2UsdAdapter'
import type { IProtocolAdapter } from '../types/IProtocolAdapter'
import type { UnwrapExchangeRate, UnwrapInput } from '../types/adapter'
import type { Chain } from './constants/chains'

export interface IUnwrapCache {
  fetchUnwrapWithCache(
    adapter: IProtocolAdapter,
    input: UnwrapInput,
  ): Promise<UnwrapExchangeRate>
  fetchPriceWithCache(
    adapter: IPricesAdapter,
    input: PricesInput,
  ): Promise<UnwrapExchangeRate>
}

export class MemoryUnwrapCache implements IUnwrapCache {
  private readonly cache: Map<
    string,
    Promise<{ value: UnwrapExchangeRate; expiryTime: number }>
  >
  private readonly expiryTimeInMs: number

  constructor(expiryTimeInMs = 600_000) {
    this.cache = new Map()
    this.expiryTimeInMs = expiryTimeInMs
  }

  async fetchUnwrapWithCache(
    adapter: IProtocolAdapter,
    input: UnwrapInput,
  ): Promise<UnwrapExchangeRate> {
    return await this.fetchWithCache(
      adapter.chainId,
      input.protocolTokenAddress,
      !!input.blockNumber,
      () => adapter.unwrap(input),
    )
  }

  async fetchPriceWithCache(
    adapter: IPricesAdapter,
    input: PricesInput,
  ): Promise<UnwrapExchangeRate> {
    return await this.fetchWithCache(
      adapter.chainId,
      input.tokenMetadata.address,
      !!input.blockNumber,
      () => adapter.getPrice(input),
    )
  }

  private async fetchWithCache(
    chainId: Chain,
    tokenAddress: string,
    ignoreCache: boolean,
    fetcher: () => Promise<UnwrapExchangeRate>,
  ) {
    if (ignoreCache) {
      return await fetcher()
    }

    const key = `${chainId}:${tokenAddress}`

    const cachedEntry = this.cache.get(key)

    if (cachedEntry && (await cachedEntry).expiryTime > Date.now()) {
      return (await cachedEntry).value
    }

    const promiseEntry = (async () => ({
      value: await fetcher(),
      expiryTime: this.getNewExpiryTime(),
    }))()

    this.cache.set(key, promiseEntry)

    return (await promiseEntry).value
  }

  private getNewExpiryTime(): number {
    return Date.now() + this.expiryTimeInMs
  }
}
