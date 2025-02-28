import type { UnwrapExchangeRate } from '@metamask-institutional/defi-adapters/dist/types/adapter.js'
import type { IUnwrapPriceCacheProvider } from '@metamask-institutional/defi-adapters/dist/unwrapCache.js'

export function buildMemoryUnwrapCacheProvider(): IUnwrapPriceCacheProvider {
  const unwrapCache = new Map<string, UnwrapExchangeRate>()

  return {
    getFromDb: async (key: string): Promise<UnwrapExchangeRate | undefined> => {
      return unwrapCache.get(key)
    },
    setToDb: async (key: string, value: UnwrapExchangeRate): Promise<void> => {
      unwrapCache.set(key, value)
    },
  }
}
