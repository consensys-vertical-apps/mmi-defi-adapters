import { type JsonRpcProvider, type Log, isError } from 'ethers'
import type { Logger } from 'pino'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fetchEvents } from './fetch-events'
import { TIMEOUT_ERROR_MESSAGE } from './utils/with-timeout'

vi.mock('./utils/with-timeout.js', async () => ({
  ...(await vi.importActual('./utils/with-timeout.js')),
  withTimeout: vi.fn(),
}))

// Mock the isError function from ethers
vi.mock('ethers', async () => ({
  ...(await vi.importActual('ethers')),
  isError: vi.fn(),
}))

describe('fetchEvents', () => {
  const mockProvider = {
    getLogs: vi.fn(),
  } as unknown as JsonRpcProvider

  const mockLogger = {
    error: vi.fn(),
    level: 'info',
    fatal: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  } as unknown as Logger

  const defaultParams = {
    provider: mockProvider,
    contractAddresses: ['0x1234567890123456789012345678901234567890'],
    topic0:
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    fromBlock: 1000,
    toBlock: 2000,
    logger: mockLogger,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    const { withTimeout } = vi.hoisted(() => ({
      withTimeout: vi.fn(),
    }))
    vi.mocked(withTimeout).mockImplementation((promise) => promise)
  })

  describe('successful log fetching', () => {
    it('should yield logs when request is successful', async () => {
      const mockLogs = [] as unknown as Log[]

      const { withTimeout } = await import('./utils/with-timeout.js')
      vi.mocked(withTimeout).mockResolvedValue(mockLogs)

      const generator = fetchEvents(defaultParams)
      const result = await generator.next()

      expect(result.done).toBe(false)
      expect(result.value).toEqual(mockLogs)
      expect(withTimeout).toHaveBeenCalledWith(
        mockProvider.getLogs({
          address: defaultParams.contractAddresses,
          fromBlock: defaultParams.fromBlock,
          toBlock: defaultParams.toBlock,
          topics: [defaultParams.topic0],
        }),
      )

      const endResult = await generator.next()
      expect(endResult.done).toBe(true)
    })
  })

  describe('error handling and retry logic', () => {
    it('should split range and retry on timeout error', async () => {
      const mockLogs = [] as unknown as Log[]

      const { withTimeout } = await import('./utils/with-timeout.js')
      const timeoutError = new Error(TIMEOUT_ERROR_MESSAGE)

      vi.mocked(withTimeout)
        .mockRejectedValueOnce(timeoutError) // First call fails
        .mockResolvedValueOnce(mockLogs) // First half succeeds
        .mockResolvedValueOnce([]) // Second half succeeds with empty array

      const generator = fetchEvents(defaultParams)

      // Should get logs from first split
      const result1 = await generator.next()
      expect(result1.value).toEqual(mockLogs)

      // Should get empty logs from second split
      const result2 = await generator.next()
      expect(result2.value).toEqual([])

      // Should be done
      const result3 = await generator.next()
      expect(result3.done).toBe(true)

      // Verify the calls were made with split ranges
      expect(withTimeout).toHaveBeenCalledTimes(3)
    })

    it('should split range on SERVER_ERROR', async () => {
      const mockLogs = [] as unknown as Log[]
      const { withTimeout } = await import('./utils/with-timeout.js')

      const serverError = new Error('Server error')
      // Mock isError to return true for SERVER_ERROR
      vi.mocked(isError).mockImplementation((error, code) => {
        return code === 'SERVER_ERROR'
      })

      vi.mocked(withTimeout)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce(mockLogs)
        .mockResolvedValueOnce(mockLogs)

      const generator = fetchEvents(defaultParams)

      // Consume all results
      let resultCount = 0
      let done = false
      while (!done) {
        const result = await generator.next()
        if (result.done) {
          done = true
        } else {
          resultCount++
        }
      }

      expect(resultCount).toBe(2)
      expect(withTimeout).toHaveBeenCalledTimes(3)
    })

    it('should split range on -32005 error (10K logs limit)', async () => {
      const mockLogs = [] as unknown as Log[]
      const { withTimeout } = await import('./utils/with-timeout.js')

      const unknownError = new Error(
        '{"code": -32005, "message": "query returned more than 10000 results"}',
      )
      // Mock isError to return true for UNKNOWN_ERROR
      vi.mocked(isError).mockImplementation((error, code) => {
        return code === 'UNKNOWN_ERROR'
      })

      vi.mocked(withTimeout)
        .mockRejectedValueOnce(unknownError)
        .mockResolvedValueOnce(mockLogs)
        .mockResolvedValueOnce(mockLogs)

      const generator = fetchEvents(defaultParams)

      // Consume all results
      let resultCount = 0
      let done = false
      while (!done) {
        const result = await generator.next()
        if (result.done) {
          done = true
        } else {
          resultCount++
        }
      }

      expect(resultCount).toBe(2)
      expect(withTimeout).toHaveBeenCalledTimes(3)
    })

    it('should split range on -32062 error (batch size too large)', async () => {
      const { withTimeout } = await import('./utils/with-timeout.js')

      const unknownError = new Error(
        '{"code": -32062, "message": "batch size too large"}',
      )
      vi.mocked(isError).mockImplementation((error, code) => {
        return code === 'UNKNOWN_ERROR'
      })

      const mockLogs = [] as unknown as Log[]
      vi.mocked(withTimeout)
        .mockRejectedValueOnce(unknownError)
        .mockResolvedValueOnce(mockLogs)
        .mockResolvedValueOnce(mockLogs)

      const generator = fetchEvents(defaultParams)

      // Consume all results
      let resultCount = 0
      let done = false
      while (!done) {
        const result = await generator.next()
        if (result.done) {
          done = true
        } else {
          resultCount++
        }
      }

      expect(resultCount).toBe(2)
    })

    it('should split range on -32602 error (5000 block range limit)', async () => {
      const { withTimeout } = await import('./utils/with-timeout.js')

      const unknownError = new Error(
        '{"code": -32602, "message": "eth_getLogs is limited to 5000 block range"}',
      )
      vi.mocked(isError).mockImplementation((error, code) => {
        return code === 'UNKNOWN_ERROR'
      })

      const mockLogs = [] as unknown as Log[]
      vi.mocked(withTimeout)
        .mockRejectedValueOnce(unknownError)
        .mockResolvedValueOnce(mockLogs)
        .mockResolvedValueOnce(mockLogs)

      const generator = fetchEvents(defaultParams)

      // Consume all results
      let resultCount = 0
      let done = false
      while (!done) {
        const result = await generator.next()
        if (result.done) {
          done = true
        } else {
          resultCount++
        }
      }

      expect(resultCount).toBe(2)
    })

    it('should split range on -32603 error (server timeout)', async () => {
      const { withTimeout } = await import('./utils/with-timeout.js')

      const unknownError = new Error(
        '{"code": -32603, "message": "server timeout"}',
      )
      vi.mocked(isError).mockImplementation((error, code) => {
        return code === 'UNKNOWN_ERROR'
      })

      const mockLogs = [] as unknown as Log[]
      vi.mocked(withTimeout)
        .mockRejectedValueOnce(unknownError)
        .mockResolvedValueOnce(mockLogs)
        .mockResolvedValueOnce(mockLogs)

      const generator = fetchEvents(defaultParams)

      // Consume all results
      let resultCount = 0
      let done = false
      while (!done) {
        const result = await generator.next()
        if (result.done) {
          done = true
        } else {
          resultCount++
        }
      }

      expect(resultCount).toBe(2)
    })

    it('should not split range on -32005 error when fromBlock equals toBlock', async () => {
      const { withTimeout } = await import('./utils/with-timeout.js')

      const unknownError = new Error(
        '{"code": -32005, "message": "query returned more than 10000 results"}',
      )
      vi.mocked(isError).mockImplementation((error, code) => {
        return code === 'UNKNOWN_ERROR'
      })

      vi.mocked(withTimeout).mockRejectedValue(unknownError)

      const params = {
        ...defaultParams,
        fromBlock: 1000,
        toBlock: 1000, // Same block
      }

      const generator = fetchEvents(params)

      await expect(generator.next()).rejects.toThrow(unknownError)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: unknownError,
          fromBlock: 1000,
          toBlock: 1000,
          depth: 0,
          contractAddresses: params.contractAddresses,
          topic0: params.topic0,
        }),
        'Fetching events failed',
      )
    })

    it('should throw and log error for non-retryable errors', async () => {
      const { withTimeout } = await import('./utils/with-timeout.js')

      const nonRetryableError = new Error('Some other error')
      vi.mocked(isError).mockReturnValue(false)
      vi.mocked(withTimeout).mockRejectedValue(nonRetryableError)

      const generator = fetchEvents(defaultParams)

      await expect(generator.next()).rejects.toThrow(nonRetryableError)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: nonRetryableError,
          fromBlock: defaultParams.fromBlock,
          toBlock: defaultParams.toBlock,
          depth: 0,
          contractAddresses: defaultParams.contractAddresses,
          topic0: defaultParams.topic0,
        }),
        'Fetching events failed',
      )
    })
  })

  describe('depth tracking', () => {
    it('should track depth correctly during recursive splits', async () => {
      const mockLogs = [] as unknown as Log[]
      const { withTimeout } = await import('./utils/with-timeout.js')

      const timeoutError = new Error(TIMEOUT_ERROR_MESSAGE)
      vi.mocked(withTimeout)
        .mockRejectedValueOnce(timeoutError) // Initial call fails
        .mockRejectedValueOnce(timeoutError) // First split fails
        .mockResolvedValueOnce(mockLogs) // First quarter succeeds
        .mockResolvedValueOnce(mockLogs) // Second quarter succeeds
        .mockResolvedValueOnce(mockLogs) // Second half succeeds

      const generator = fetchEvents({ ...defaultParams, depth: 1 })

      // Consume all results
      let resultCount = 0
      let done = false
      while (!done) {
        const result = await generator.next()
        if (result.done) {
          done = true
        } else {
          resultCount++
        }
      }

      expect(resultCount).toBe(3)
      expect(withTimeout).toHaveBeenCalledTimes(5)
    })
  })

  describe('parameter validation', () => {
    it('should handle multiple contract addresses', async () => {
      const mockLogs = [] as unknown as Log[]
      const { withTimeout } = await import('./utils/with-timeout.js')
      vi.mocked(withTimeout).mockResolvedValue(mockLogs)

      const addresses = [
        '0x1234567890123456789012345678901234567890',
        '0x0987654321098765432109876543210987654321',
      ]

      const generator = fetchEvents({
        ...defaultParams,
        contractAddresses: addresses,
      })

      await generator.next()

      expect(withTimeout).toHaveBeenCalledWith(
        mockProvider.getLogs({
          address: addresses,
          fromBlock: defaultParams.fromBlock,
          toBlock: defaultParams.toBlock,
          topics: [defaultParams.topic0],
        }),
      )
    })

    it('should use correct topic0 parameter', async () => {
      const mockLogs = [] as unknown as Log[]
      const { withTimeout } = await import('./utils/with-timeout.js')
      vi.mocked(withTimeout).mockResolvedValue(mockLogs)

      const customTopic =
        '0x1111111111111111111111111111111111111111111111111111111111111111'

      const generator = fetchEvents({
        ...defaultParams,
        topic0: customTopic,
      })

      await generator.next()

      expect(withTimeout).toHaveBeenCalledWith(
        mockProvider.getLogs({
          address: defaultParams.contractAddresses,
          fromBlock: defaultParams.fromBlock,
          toBlock: defaultParams.toBlock,
          topics: [customTopic],
        }),
      )
    })
  })
})
