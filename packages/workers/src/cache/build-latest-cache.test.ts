import type { JsonRpcProvider } from 'ethers'
import type { Logger } from 'pino'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CacheClient } from '../postgres-cache-client.js'
import { extractErrorMessage } from '../utils/extractErrorMessage.js'
import { buildLatestCache } from './build-latest-cache.js'
import { processBlock } from './process-block.js'
import { waitForBlock } from './wait-for-block.js'

vi.mock('./process-block.js')
vi.mock('./wait-for-block.js')
vi.mock('../utils/extractErrorMessage.js')

describe('buildLatestCache', () => {
  let provider: JsonRpcProvider
  let cacheClient: CacheClient
  let logger: Logger
  let userIndexMap: Map<
    string,
    { userAddressIndex: number; eventAbi: string | null }
  >

  beforeEach(() => {
    provider = {
      getBlockNumber: vi.fn(),
    } as unknown as JsonRpcProvider
    cacheClient = {
      insertLogs: vi.fn(),
      updateLatestBlockProcessed: vi.fn(),
    } as unknown as CacheClient
    logger = {
      info: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger
    userIndexMap = new Map()

    vi.mocked(extractErrorMessage).mockImplementation((e: unknown) =>
      e instanceof Error ? e.message : String(e),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should process a single block when not in batch mode', async () => {
    const processingBlockNumber = 100
    const latestBlockNumber = 105
    vi.mocked(waitForBlock).mockResolvedValue(latestBlockNumber)
    vi.mocked(processBlock).mockResolvedValue([
      { address: '0xUser', contractAddress: '0xContract' },
    ])

    const result = await buildLatestCache({
      processingBlockNumber,
      provider,
      cacheClient,
      userIndexMap,
      logger,
    })

    expect(waitForBlock).toHaveBeenCalledWith(
      processingBlockNumber,
      provider,
      logger,
    )
    expect(result.nextProcessingBlockNumber).toBe(101)
    expect(result.latestBlockNumber).toBe(105)
    expect(processBlock).toHaveBeenCalledOnce()
    expect(processBlock).toHaveBeenCalledWith({
      provider,
      blockNumber: processingBlockNumber,
      userIndexMap,
      logger,
    })
    expect(cacheClient.insertLogs).toHaveBeenCalledWith(
      [{ address: '0xUser', contractAddress: '0xContract' }],
      processingBlockNumber,
    )
  })

  it('should process a batch of blocks when in batch mode', async () => {
    const processingBlockNumber = 100
    const latestBlockNumber = 120
    const BATCH_SIZE = 10 // from the file
    vi.mocked(waitForBlock).mockResolvedValue(latestBlockNumber)
    vi.mocked(processBlock).mockImplementation(async ({ blockNumber }) => {
      if (blockNumber % 2 === 0) {
        return [
          {
            address: `0xUser${blockNumber}`,
            contractAddress: '0xContract',
          },
        ]
      }
      return []
    })

    const result = await buildLatestCache({
      processingBlockNumber,
      provider,
      cacheClient,
      userIndexMap,
      logger,
    })

    const batchEndBlock = processingBlockNumber + BATCH_SIZE
    expect(result.nextProcessingBlockNumber).toBe(batchEndBlock)
    expect(result.latestBlockNumber).toBe(120)
    expect(processBlock).toHaveBeenCalledTimes(BATCH_SIZE)
    expect(cacheClient.insertLogs).toHaveBeenCalledTimes(1)

    // Check logs for only even block numbers
    const expectedLogs = [100, 102, 104, 106, 108].map((n) => ({
      address: `0xUser${n}`,
      contractAddress: '0xContract',
    }))
    expect(cacheClient.insertLogs).toHaveBeenCalledWith(
      expectedLogs,
      batchEndBlock - 1,
    )
  })

  it('should handle errors during block processing and rollback', async () => {
    const processingBlockNumber = 100
    const latestBlockNumber = 105
    vi.mocked(waitForBlock).mockResolvedValue(latestBlockNumber)
    const error = new Error('Test Error')
    vi.mocked(processBlock).mockRejectedValue(error)

    // Fake timers are needed for the 1 second delay in the error handler
    vi.useFakeTimers()
    const promise = buildLatestCache({
      processingBlockNumber,
      provider,
      cacheClient,
      userIndexMap,
      logger,
    })

    await vi.advanceTimersByTimeAsync(1000)
    const result = await promise
    vi.useRealTimers()

    const BATCH_SIZE = 10
    const earliestSafeBlock = processingBlockNumber - BATCH_SIZE

    expect(logger.error).toHaveBeenCalledWith(
      { error, processingBlockNumber, latestBlockNumber: 105 },
      'Error processing block',
    )
    expect(cacheClient.updateLatestBlockProcessed).toHaveBeenCalledWith(
      earliestSafeBlock,
    )
    expect(result.nextProcessingBlockNumber).toBe(earliestSafeBlock)
  })

  it('should handle errors during rollback', async () => {
    const processingBlockNumber = 100
    const latestBlockNumber = 105
    vi.mocked(waitForBlock).mockResolvedValue(latestBlockNumber)
    const processError = new Error('Process Error')
    const rollbackError = new Error('Rollback Error')
    vi.mocked(processBlock).mockRejectedValue(processError)
    vi.mocked(cacheClient.updateLatestBlockProcessed).mockRejectedValue(
      rollbackError,
    )

    vi.useFakeTimers()
    const promise = buildLatestCache({
      processingBlockNumber,
      provider,
      cacheClient,
      userIndexMap,
      logger,
    })
    await vi.advanceTimersByTimeAsync(1000)
    const result = await promise
    vi.useRealTimers()

    const BATCH_SIZE = 10
    const earliestSafeBlock = processingBlockNumber - BATCH_SIZE

    expect(logger.error).toHaveBeenCalledWith(
      {
        processingBlockNumber,
        earliestSafeBlock,
        error: 'Rollback Error',
      },
      'Error trying to rollback latest block processed',
    )
    expect(result.nextProcessingBlockNumber).toBe(processingBlockNumber)
  })
})
