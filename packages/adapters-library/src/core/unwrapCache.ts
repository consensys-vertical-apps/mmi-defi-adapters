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
    { value: UnwrapExchangeRate; expiryTime: number }
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

    if (cachedEntry && cachedEntry.expiryTime > Date.now()) {
      return cachedEntry.value
    }

    const value = await fetcher()

    this.cache.set(key, {
      value,
      expiryTime: this.getNewExpiryTime(),
    })

    return value
  }

  private getNewExpiryTime(): number {
    return Date.now() + this.expiryTimeInMs
  }
}
