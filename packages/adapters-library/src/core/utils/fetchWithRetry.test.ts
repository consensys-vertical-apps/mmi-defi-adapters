import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWithRetry } from './fetchWithRetry'

// Mock the global fetch function
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock setTimeout to control timing in tests
vi.useFakeTimers()

const mockUrl = 'http://localhost'
const mockOptions = { method: 'POST', body: JSON.stringify({ data: 'test' }) }
const mockSuccessResponse = {
  ok: true,
  status: 200,
  json: async () => ({ message: 'success' }),
  text: async () => 'success',
} as unknown as Response

const mockErrorResponse = {
  ok: false,
  status: 500,
  json: async () => ({ message: 'error' }),
  text: async () => 'error',
} as unknown as Response

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should return a successful response on the first try', async () => {
    mockFetch.mockResolvedValueOnce(mockSuccessResponse)

    const response = await fetchWithRetry(mockUrl, mockOptions)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(mockUrl, mockOptions)
    expect(response).toEqual(mockSuccessResponse)
  })

  it('should retry and succeed if the first few attempts fail', async () => {
    mockFetch
      .mockResolvedValueOnce(mockErrorResponse)
      .mockResolvedValueOnce(mockErrorResponse)
      .mockResolvedValueOnce(mockSuccessResponse)

    const response = await fetchWithRetry(mockUrl, mockOptions, 3)

    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(mockFetch).toHaveBeenCalledWith(mockUrl, mockOptions)
    expect(vi.getTimerCount()).toBe(2) // Two delays before the successful call

    // Advance timers to trigger retries
    await vi.advanceTimersByTimeAsync(500) // First retry
    await vi.advanceTimersByTimeAsync(500) // Second retry

    expect(response).toEqual(mockSuccessResponse)
  })

  it('should throw an error if all retries fail', async () => {
    mockFetch.mockResolvedValue(mockErrorResponse) // All attempts will fail

    await expect(fetchWithRetry(mockUrl, mockOptions, 2)).rejects.toThrow(
      'Fetch failed with status 500',
    )

    expect(mockFetch).toHaveBeenCalledTimes(3) // Initial call + 2 retries
    expect(vi.getTimerCount()).toBe(2)

    // Advance timers
    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(500)
  })

  it('should use default MAX_RETRIES if retries parameter is not provided', async () => {
    mockFetch.mockResolvedValue(mockErrorResponse) // All attempts will fail

    await expect(fetchWithRetry(mockUrl, mockOptions)).rejects.toThrow(
      'Fetch failed with status 500',
    )
    // Default is 3 retries, so 1 initial call + 3 retries = 4 calls
    expect(mockFetch).toHaveBeenCalledTimes(4)
    expect(vi.getTimerCount()).toBe(3)

    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(500)
  })

  it('should not retry if retries is 0 and fetch fails', async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse)

    await expect(fetchWithRetry(mockUrl, mockOptions, 0)).rejects.toThrow(
      'Fetch failed with status 500',
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should throw the original error if retries are exhausted and the last error is not a Response object', async () => {
    const customError = new Error('Network error')
    mockFetch.mockRejectedValue(customError) // All attempts will fail with a non-Response error

    await expect(fetchWithRetry(mockUrl, mockOptions, 2)).rejects.toThrow(
      'Network error',
    )

    expect(mockFetch).toHaveBeenCalledTimes(3) // Initial call + 2 retries
    expect(vi.getTimerCount()).toBe(2)

    // Advance timers
    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(500)
  })
})
