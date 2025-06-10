import type { JsonRpcProvider } from 'ethers'
import type { Logger } from 'pino'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { extractErrorMessage } from '../utils/extractErrorMessage.js'
import { withTimeout } from '../utils/with-timeout.js'
import { waitForBlock } from './wait-for-block.js'

vi.mock('../utils/with-timeout.js')
vi.mock('../utils/extractErrorMessage.js')

describe('waitForBlock', () => {
  let provider: JsonRpcProvider
  let logger: Logger

  beforeEach(() => {
    provider = {
      getBlockNumber: vi.fn(),
    } as unknown as JsonRpcProvider
    logger = {
      info: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger

    vi.useFakeTimers()
    vi.mocked(withTimeout).mockImplementation(async (promise) => promise)
    vi.mocked(extractErrorMessage).mockImplementation((e: unknown) =>
      e instanceof Error ? e.message : String(e),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should return immediately if block number is already sufficient', async () => {
    const targetBlockNumber = 100
    const latestBlockNumber = 101
    vi.mocked(provider.getBlockNumber).mockResolvedValue(latestBlockNumber)

    const result = await waitForBlock(targetBlockNumber, provider, logger)

    expect(result).toBe(latestBlockNumber)
    expect(provider.getBlockNumber).toHaveBeenCalledOnce()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('should wait and retry until block number is sufficient', async () => {
    const targetBlockNumber = 100
    vi.mocked(provider.getBlockNumber)
      .mockResolvedValueOnce(98)
      .mockResolvedValueOnce(99)
      .mockResolvedValueOnce(100)

    const promise = waitForBlock(targetBlockNumber, provider, logger)

    await vi.advanceTimersToNextTimerAsync() // 1s backoff
    await vi.advanceTimersToNextTimerAsync() // 2s backoff

    const result = await promise

    expect(result).toBe(100)
    expect(provider.getBlockNumber).toHaveBeenCalledTimes(3)
  })

  it('should handle errors when fetching block number and continue retrying', async () => {
    const targetBlockNumber = 100
    const error = new Error('Provider Error')
    vi.mocked(provider.getBlockNumber)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(99)
      .mockResolvedValueOnce(101)

    const promise = waitForBlock(targetBlockNumber, provider, logger)

    await vi.advanceTimersToNextTimerAsync() // 1s backoff
    await vi.advanceTimersToNextTimerAsync() // 2s backoff

    const result = await promise

    expect(result).toBe(101)
    expect(logger.error).toHaveBeenCalledWith(
      { error: 'Provider Error' },
      'Error fetching block number',
    )
    expect(provider.getBlockNumber).toHaveBeenCalledTimes(3)
  })

  it('should increase backoff time exponentially', async () => {
    const targetBlockNumber = 100
    vi.mocked(provider.getBlockNumber)
      .mockResolvedValueOnce(96)
      .mockResolvedValueOnce(97)
      .mockResolvedValueOnce(100)

    const promise = waitForBlock(targetBlockNumber, provider, logger)
    const ONE_SECOND = 1000

    // 1st attempt fails, waits 1s
    await vi.advanceTimersByTimeAsync(ONE_SECOND)
    // 2nd attempt fails, waits 2s
    await vi.advanceTimersByTimeAsync(ONE_SECOND * 2)

    const result = await promise
    expect(result).toBe(100)
    expect(provider.getBlockNumber).toHaveBeenCalledTimes(3)
  })

  it('should cap backoff time at 60 seconds', async () => {
    const targetBlockNumber = 100
    vi.mocked(provider.getBlockNumber)
      .mockResolvedValue(99) // Always fail until the last one
      .mockResolvedValueOnce(90) // 1s
      .mockResolvedValueOnce(91) // 2s
      .mockResolvedValueOnce(92) // 4s
      .mockResolvedValueOnce(93) // 8s
      .mockResolvedValueOnce(94) // 16s
      .mockResolvedValueOnce(95) // 32s
      .mockResolvedValueOnce(96) // 60s (capped)
      .mockResolvedValueOnce(97) // 60s (capped)
      .mockResolvedValue(100) // Success

    const promise = waitForBlock(targetBlockNumber, provider, logger)

    await vi.runAllTimersAsync()

    const result = await promise

    expect(result).toBe(100)
    // 8 failures + 1 success
    expect(provider.getBlockNumber).toHaveBeenCalledTimes(9)
  })
})
