import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPricesAdapter } from '../adapters/prices-v2/products/usd/pricesV2UsdAdapter'
import { IProtocolAdapter } from '../types/IProtocolAdapter'
import { AVERAGE_BLOCKS_PER_10_MINUTES } from './constants/AVERAGE_BLOCKS_PER_10_MINS'
import { Chain } from './constants/chains'
import { MemoryUnwrapCache } from './unwrapCache'

describe('UnwrapCache', () => {
  describe('fetchWithCache', () => {
    const unwrapResult = {}

    const mockTokenMetadata = {
      address: '0x123',
      decimals: 18,
      name: 'test',
      symbol: 'test',
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    describe('fetchUnwrapWithCache', () => {
      const mockUnwrapAdapter = {
        chainId: Chain.Ethereum,
        unwrap: vi.fn().mockResolvedValue(unwrapResult),
      } as unknown as IProtocolAdapter

      const unwrapInputWithoutBlockNumber = {
        protocolTokenAddress: mockTokenMetadata.address,
      }

      it('calls unwrap if there is no value in the cache', async () => {
        const unwrapCache = new MemoryUnwrapCache()

        const result = await unwrapCache.fetchUnwrapWithCache(
          mockUnwrapAdapter,
          unwrapInputWithoutBlockNumber,
        )

        expect(result).toEqual(unwrapResult)
        expect(mockUnwrapAdapter.unwrap).toHaveBeenCalledWith(
          unwrapInputWithoutBlockNumber,
        )
      })

      it('does not call unwrap if there is a value in the cache', async () => {
        const unwrapCache = new MemoryUnwrapCache()

        // First call so that the cache is populated
        await unwrapCache.fetchUnwrapWithCache(
          mockUnwrapAdapter,
          unwrapInputWithoutBlockNumber,
        )

        vi.clearAllMocks()

        const result = await unwrapCache.fetchUnwrapWithCache(
          mockUnwrapAdapter,
          unwrapInputWithoutBlockNumber,
        )

        expect(result).toEqual(unwrapResult)
        expect(mockUnwrapAdapter.unwrap).not.toHaveBeenCalled()
      })

      it('calls unwrap if there is a value in the cache but the block number is provided', async () => {
        const unwrapCache = new MemoryUnwrapCache()

        const unwrapInputWithBlockNumber = {
          protocolTokenAddress: mockTokenMetadata.address,
          blockNumber: 123,
        }

        // First call so that the cache is populated
        await unwrapCache.fetchUnwrapWithCache(
          mockUnwrapAdapter,
          unwrapInputWithBlockNumber,
        )

        vi.clearAllMocks()

        const result = await unwrapCache.fetchUnwrapWithCache(
          mockUnwrapAdapter,
          unwrapInputWithBlockNumber,
        )

        expect(result).toEqual(unwrapResult)
        expect(mockUnwrapAdapter.unwrap).toHaveBeenCalledWith(
          unwrapInputWithBlockNumber,
        )
      })

      it('calls unwrap if the cache is expired', async () => {
        const expiryTime = 1000
        const unwrapCache = new MemoryUnwrapCache(expiryTime)

        vi.useFakeTimers()

        // First call so that the cache is populated
        await unwrapCache.fetchUnwrapWithCache(
          mockUnwrapAdapter,
          unwrapInputWithoutBlockNumber,
        )

        vi.clearAllMocks()

        vi.setSystemTime(Date.now() + expiryTime + 1)

        const result = await unwrapCache.fetchUnwrapWithCache(
          mockUnwrapAdapter,
          unwrapInputWithoutBlockNumber,
        )

        expect(result).toEqual(unwrapResult)
        expect(mockUnwrapAdapter.unwrap).toHaveBeenCalledWith(
          unwrapInputWithoutBlockNumber,
        )
      })
    })

    describe('fetchPriceWithCache', () => {
      const mockPriceAdapter = {
        chainId: Chain.Ethereum,
        getPrice: vi.fn().mockResolvedValue(unwrapResult),
      } as unknown as IPricesAdapter

      const pricesInputWithoutBlockNumber = {
        tokenMetadata: mockTokenMetadata,
      }

      it('calls unwrap if there is no value in the cache', async () => {
        const unwrapCache = new MemoryUnwrapCache()

        const result = await unwrapCache.fetchPriceWithCache(
          mockPriceAdapter,
          pricesInputWithoutBlockNumber,
        )

        expect(result).toEqual(unwrapResult)
        expect(mockPriceAdapter.getPrice).toHaveBeenCalledWith(
          pricesInputWithoutBlockNumber,
        )
      })

      it('does not call unwrap if there is a value in the cache', async () => {
        const unwrapCache = new MemoryUnwrapCache()

        // First call so that the cache is populated
        await unwrapCache.fetchPriceWithCache(
          mockPriceAdapter,
          pricesInputWithoutBlockNumber,
        )

        vi.clearAllMocks()

        const result = await unwrapCache.fetchPriceWithCache(
          mockPriceAdapter,
          pricesInputWithoutBlockNumber,
        )

        expect(result).toEqual(unwrapResult)
        expect(mockPriceAdapter.getPrice).not.toHaveBeenCalled()
      })

      it('calls unwrap if there is a value in the cache but the block number is provided', async () => {
        const unwrapCache = new MemoryUnwrapCache()

        const pricesInputWithBlockNumber = {
          tokenMetadata: mockTokenMetadata,
          blockNumber: 123,
        }

        // First call so that the cache is populated
        await unwrapCache.fetchPriceWithCache(
          mockPriceAdapter,
          pricesInputWithBlockNumber,
        )

        vi.clearAllMocks()

        const result = await unwrapCache.fetchPriceWithCache(
          mockPriceAdapter,
          pricesInputWithBlockNumber,
        )

        expect(result).toEqual(unwrapResult)
        expect(mockPriceAdapter.getPrice).toHaveBeenCalledWith(
          pricesInputWithBlockNumber,
        )
      })

      it('calls unwrap if the cache is expired', async () => {
        const expiryTime = 1000
        const unwrapCache = new MemoryUnwrapCache(expiryTime)

        vi.useFakeTimers()

        // First call so that the cache is populated
        await unwrapCache.fetchPriceWithCache(
          mockPriceAdapter,
          pricesInputWithoutBlockNumber,
        )

        vi.clearAllMocks()

        vi.setSystemTime(Date.now() + expiryTime + 1)

        const result = await unwrapCache.fetchPriceWithCache(
          mockPriceAdapter,
          pricesInputWithoutBlockNumber,
        )

        expect(result).toEqual(unwrapResult)
        expect(mockPriceAdapter.getPrice).toHaveBeenCalledWith(
          pricesInputWithoutBlockNumber,
        )
      })
    })
  })
})
