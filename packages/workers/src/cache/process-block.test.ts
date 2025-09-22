import type { JsonRpcProvider, Log, TransactionReceipt } from 'ethers'
import type { Logger } from 'pino'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withTimeout } from '../utils/with-timeout.js'
import { createWatchKey } from './create-watch-key.js'
import { parseUserEventLog } from './parse-user-event-log.js'
import { processBlock } from './process-block.js'

vi.mock('../utils/with-timeout.js', () => ({
  withTimeout: vi.fn((promise) => promise),
}))
vi.mock('./parse-user-event-log.js')
vi.mock('./create-watch-key.js')
vi.mock('../utils/extractErrorMessage.js', () => ({
  extractErrorMessage: (e: Error) => e.message,
}))
vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers')
  return {
    ...actual,
    getAddress: (addr: string) => addr.toLowerCase(),
    ethers: {
      ...(typeof actual.ethers === 'object' &&
        actual.ethers !== null &&
        actual.ethers),
      toBeHex: (val: number) => `0x${val.toString(16)}`,
    },
  }
})

describe('processBlock', () => {
  let provider: JsonRpcProvider
  let logger: Logger
  let userIndexMap: Map<
    string,
    { userAddressIndex: number; eventAbi: string | null }
  >

  beforeEach(() => {
    provider = {
      send: vi.fn(),
    } as unknown as JsonRpcProvider
    logger = {
      info: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger
    userIndexMap = new Map()

    vi.mocked(withTimeout).mockImplementation((promise) => promise)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return empty logs if provider returns no receipts', async () => {
    vi.mocked(provider.send).mockResolvedValue([])

    const result = await processBlock({
      provider,
      blockNumber: 1,
      userIndexMap,
      logger,
    })
    expect(result).toEqual([])
    expect(provider.send).toHaveBeenCalledWith('eth_getBlockReceipts', ['0x1'])
  })

  it('should process a block with relevant logs successfully', async () => {
    const mockReceipts: Partial<TransactionReceipt>[] = [
      {
        logs: [
          {
            address: '0xContract1',
            topics: ['0xtopic0_1'],
            transactionHash: '0xTxHash1',
          } as unknown as Log,
          {
            address: '0xContract2',
            topics: ['0xtopic0_2'],
            transactionHash: '0xTxHash2',
          } as unknown as Log,
        ],
      },
    ]
    vi.mocked(provider.send).mockResolvedValue(mockReceipts)

    userIndexMap.set('watchkey1', {
      userAddressIndex: 1,
      eventAbi: 'event Test1()',
    })
    userIndexMap.set('watchkey2', {
      userAddressIndex: 2,
      eventAbi: 'event Test2()',
    })

    vi.mocked(createWatchKey)
      .mockReturnValueOnce('watchkey1')
      .mockReturnValueOnce('watchkey2')

    vi.mocked(parseUserEventLog)
      .mockReturnValueOnce({ userAddress: '0xUser1', metadata: undefined })
      .mockReturnValueOnce({ userAddress: '0xUser2', metadata: undefined })

    const result = await processBlock({
      provider,
      blockNumber: 1,
      userIndexMap,
      logger,
    })

    expect(result).toEqual([
      {
        address: '0xUser1',
        contractAddress: '0xcontract1',
        metadata: undefined,
      },
      {
        address: '0xUser2',
        contractAddress: '0xcontract2',
        metadata: undefined,
      },
    ])
    expect(parseUserEventLog).toHaveBeenCalledTimes(2)
  })

  it('should handle logs that are not in the userIndexMap', async () => {
    const mockReceipts: Partial<TransactionReceipt>[] = [
      {
        logs: [
          {
            address: '0xContract1',
            topics: ['0xtopic0_1'],
            transactionHash: '0xTxHash1',
          } as unknown as Log,
        ],
      },
    ]
    vi.mocked(provider.send).mockResolvedValue(mockReceipts)

    vi.mocked(createWatchKey).mockReturnValueOnce('watchkey1')

    const result = await processBlock({
      provider,
      blockNumber: 1,
      userIndexMap,
      logger,
    })

    expect(result).toEqual([])
    expect(parseUserEventLog).not.toHaveBeenCalled()
  })

  it('should handle logs with no topic0', async () => {
    const mockReceipts: Partial<TransactionReceipt>[] = [
      {
        logs: [
          {
            address: '0xContract1',
            topics: [],
            transactionHash: '0xTxHash1',
          } as unknown as Log,
        ],
      },
    ]
    vi.mocked(provider.send).mockResolvedValue(mockReceipts)

    const result = await processBlock({
      provider,
      blockNumber: 1,
      userIndexMap,
      logger,
    })

    expect(result).toEqual([])
    expect(parseUserEventLog).not.toHaveBeenCalled()
  })

  it('should handle errors during log parsing', async () => {
    const mockReceipts: Partial<TransactionReceipt>[] = [
      {
        logs: [
          {
            address: '0xContract1',
            topics: ['0xtopic0_1'],
            transactionHash: '0xTxHash1',
          } as unknown as Log,
        ],
      },
    ]
    vi.mocked(provider.send).mockResolvedValue(mockReceipts)

    userIndexMap.set('watchkey1', {
      userAddressIndex: 1,
      eventAbi: 'event Test1()',
    })
    vi.mocked(createWatchKey).mockReturnValueOnce('watchkey1')

    const error = new Error('Parse Error')
    vi.mocked(parseUserEventLog).mockImplementation(() => {
      throw error
    })

    const result = await processBlock({
      provider,
      blockNumber: 1,
      userIndexMap,
      logger,
    })

    expect(result).toEqual([])
    expect(logger.error).toHaveBeenCalledWith(
      {
        error: 'Parse Error',
        txHash: '0xTxHash1',
        eventAbi: 'event Test1()',
        userAddressIndex: 1,
      },
      'Error parsing log',
    )
  })

  it('should return an empty array if receipts are null or flat returns empty', async () => {
    vi.mocked(provider.send).mockResolvedValue(null)
    let result = await processBlock({
      provider,
      blockNumber: 1,
      userIndexMap,
      logger,
    })
    expect(result).toEqual([])

    const mockReceiptsWithNull = [null]
    vi.mocked(provider.send).mockResolvedValue(
      mockReceiptsWithNull.filter(Boolean),
    )
    result = await processBlock({
      provider,
      blockNumber: 1,
      userIndexMap,
      logger,
    })
    expect(result).toEqual([])
  })
})
