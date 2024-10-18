import { IPricesAdapter } from './adapters/prices-v2/products/usd/pricesV2UsdAdapter'
import { AVERAGE_BLOCKS_PER_10_MINUTES } from './core/constants/AVERAGE_BLOCKS_PER_10_MINS'
import { Chain } from './core/constants/chains'
import { IProtocolAdapter } from './types/IProtocolAdapter'
import {
  IUnwrapPriceCacheProvider,
  UnwrapPriceCache,
  getTenMinuteKeyByBlock,
} from './unwrapCache'

describe('UnwrapCache', () => {
  describe('fetchWithCache', () => {
    const unwrapResult = {}
    const mockUnwrapAdapter = {
      chainId: Chain.Ethereum,
      unwrap: jest.fn().mockResolvedValue(unwrapResult),
    } as unknown as IProtocolAdapter
    const mockPriceAdapter = {
      chainId: Chain.Ethereum,
      getPrice: jest.fn().mockResolvedValue(unwrapResult),
    } as unknown as IPricesAdapter

    const unwrapInput = {
      protocolTokenAddress: '0x123',
      blockNumber: 123,
    }
    const priceInput = {
      tokenMetadata: {
        address: '0x123',
        decimals: 18,
        name: 'test',
        symbol: 'test',
      },
      blockNumber: 123,
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('returns immediatelly if there is no provider', async () => {
      const unwrapCache = new UnwrapPriceCache()

      const result = await unwrapCache.fetchUnwrapWithCache(
        mockUnwrapAdapter,
        unwrapInput,
      )

      expect(result).toEqual(unwrapResult)
      expect(mockUnwrapAdapter.unwrap).toHaveBeenCalledWith(unwrapInput)
    })

    it('misses cache if no value is provided', async () => {
      const unwrapCacheProvider = {
        getFromDb: jest.fn(),
        setToDb: jest.fn(),
      } as IUnwrapPriceCacheProvider
      const unwrapCache = new UnwrapPriceCache(unwrapCacheProvider)

      const result = await unwrapCache.fetchUnwrapWithCache(
        mockUnwrapAdapter,
        unwrapInput,
      )

      expect(result).toEqual(unwrapResult)
      expect(unwrapCacheProvider.getFromDb).toHaveBeenCalled()
      expect(unwrapCacheProvider.setToDb).toHaveBeenCalled()
      expect(mockUnwrapAdapter.unwrap).toHaveBeenCalledWith(unwrapInput)
    })

    it('hits cache if a value is provided', async () => {
      const unwrapCacheProvider = {
        getFromDb: jest.fn().mockResolvedValueOnce({}),
        setToDb: jest.fn(),
      } as IUnwrapPriceCacheProvider
      const unwrapCache = new UnwrapPriceCache(unwrapCacheProvider)

      const result = await unwrapCache.fetchUnwrapWithCache(
        mockUnwrapAdapter,
        unwrapInput,
      )

      expect(result).toEqual(unwrapResult)
      expect(unwrapCacheProvider.getFromDb).toHaveBeenCalled()
      expect(unwrapCacheProvider.setToDb).not.toHaveBeenCalled()
      expect(mockUnwrapAdapter.unwrap).not.toHaveBeenCalledWith(unwrapInput)
    })
    it('misses price cache if no value is provided', async () => {
      const unwrapCacheProvider = {
        getFromDb: jest.fn(),
        setToDb: jest.fn(),
      } as IUnwrapPriceCacheProvider
      const unwrapCache = new UnwrapPriceCache(unwrapCacheProvider)

      const result = await unwrapCache.fetchPriceWithCache(
        mockPriceAdapter,
        priceInput,
      )

      expect(result).toEqual(unwrapResult)
      expect(unwrapCacheProvider.getFromDb).toHaveBeenCalled()
      expect(unwrapCacheProvider.setToDb).toHaveBeenCalled()
      expect(mockPriceAdapter.getPrice).toHaveBeenCalledWith(priceInput)
    })

    it('hits price cache if a value is provided', async () => {
      const unwrapCacheProvider = {
        getFromDb: jest.fn().mockResolvedValueOnce({}),
        setToDb: jest.fn(),
      } as IUnwrapPriceCacheProvider
      const unwrapCache = new UnwrapPriceCache(unwrapCacheProvider)

      const result = await unwrapCache.fetchPriceWithCache(
        mockPriceAdapter,
        priceInput,
      )

      expect(result).toEqual(unwrapResult)
      expect(unwrapCacheProvider.getFromDb).toHaveBeenCalled()
      expect(unwrapCacheProvider.setToDb).not.toHaveBeenCalled()
      expect(mockUnwrapAdapter.unwrap).not.toHaveBeenCalledWith(priceInput)
    })
  })
})

describe('getTenMinuteKeyByBlock', () => {
  it('returns same key with blocks within the same range', async () => {
    const blockNumber1 = AVERAGE_BLOCKS_PER_10_MINUTES[Chain.Ethereum] * 10
    const blockNumber2 = AVERAGE_BLOCKS_PER_10_MINUTES[Chain.Ethereum] * 11 - 1

    const result1 = getTenMinuteKeyByBlock(blockNumber1, Chain.Ethereum)
    const result2 = getTenMinuteKeyByBlock(blockNumber2, Chain.Ethereum)

    expect(result1).toEqual(result2)
  })

  it('returns different key with blocks that are in different ranges', async () => {
    const blockNumber1 = AVERAGE_BLOCKS_PER_10_MINUTES[Chain.Ethereum] * 10
    const blockNumber2 = AVERAGE_BLOCKS_PER_10_MINUTES[Chain.Ethereum] * 11

    const result1 = getTenMinuteKeyByBlock(blockNumber1, Chain.Ethereum)
    const result2 = getTenMinuteKeyByBlock(blockNumber2, Chain.Ethereum)

    expect(result1).not.toEqual(result2)
  })

  it('returns same key with timestamps within the same 10 minutes range', async () => {
    const mockDateNow = jest
      .spyOn(Date, 'now')
      .mockImplementationOnce(() => new Date('2024-09-01T00:00:00Z').getTime())
      .mockImplementationOnce(() => new Date('2024-09-01T00:01:00Z').getTime())

    const result1 = getTenMinuteKeyByBlock(undefined, Chain.Ethereum)
    const result2 = getTenMinuteKeyByBlock(undefined, Chain.Ethereum)

    expect(result1).toEqual(result2)

    mockDateNow.mockRestore()
  })

  it('returns same key with timestamps that are in different ranges', async () => {
    const mockDateNow = jest
      .spyOn(Date, 'now')
      .mockImplementationOnce(() => new Date('2024-09-01T00:00:00Z').getTime())
      .mockImplementationOnce(() => new Date('2024-09-01T00:10:00Z').getTime())

    const result1 = getTenMinuteKeyByBlock(undefined, Chain.Ethereum)
    const result2 = getTenMinuteKeyByBlock(undefined, Chain.Ethereum)

    expect(result1).not.toEqual(result2)

    mockDateNow.mockRestore()
  })
})
