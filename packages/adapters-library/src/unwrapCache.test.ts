import { AVERAGE_BLOCKS_PER_10_MINUTES } from './core/constants/AVERAGE_BLOCKS_PER_10_MINS'
import { Chain } from './core/constants/chains'
import { IProtocolAdapter } from './types/IProtocolAdapter'
import {
  getTenMinuteKeyByBlock,
  IUnwrapCacheProvider,
  UnwrapCache,
} from './unwrapCache'

describe('UnwrapCache', () => {
  const unwrapResult = {}
  const mockAdapter = {
    chainId: Chain.Ethereum,
    unwrap: jest.fn().mockResolvedValue(unwrapResult),
  } as unknown as IProtocolAdapter

  const unwrapInput = {
    protocolTokenAddress: '0x123',
    blockNumber: 123,
  }

  describe('fetchWithCache', () => {
    it('misses cache if no value is provided', async () => {
      const unwrapCacheProvider = {
        getFromDb: jest.fn(),
        setToDb: jest.fn(),
      } as IUnwrapCacheProvider
      const unwrapCache = new UnwrapCache(unwrapCacheProvider)

      const result = await unwrapCache.fetchWithCache(mockAdapter, unwrapInput)

      expect(result).toEqual(unwrapResult)
      expect(unwrapCacheProvider.getFromDb).toHaveBeenCalled()
      expect(unwrapCacheProvider.setToDb).toHaveBeenCalled()
      expect(mockAdapter.unwrap).toHaveBeenCalledWith(unwrapInput)
    })

    it('hits cache if a value is provided', async () => {
      const unwrapCacheProvider = {
        getFromDb: jest.fn().mockResolvedValueOnce({}),
        setToDb: jest.fn(),
      } as IUnwrapCacheProvider
      const unwrapCache = new UnwrapCache(unwrapCacheProvider)

      const result = await unwrapCache.fetchWithCache(mockAdapter, unwrapInput)

      expect(result).toEqual(unwrapResult)
      expect(unwrapCacheProvider.getFromDb).toHaveBeenCalled()
      expect(unwrapCacheProvider.setToDb).not.toHaveBeenCalled()
      expect(mockAdapter.unwrap).not.toHaveBeenCalledWith(unwrapInput)
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
