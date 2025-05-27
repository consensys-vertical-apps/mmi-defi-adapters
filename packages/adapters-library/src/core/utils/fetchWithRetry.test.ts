import { Mock, afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWithRetry } from './fetchWithRetry'

describe('fetchWithRetry', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  function mockFetch(mock: Mock) {
    global.fetch = mock
  }

  it('returns value on first try', async () => {
    mockFetch(
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
      }),
    )

    const result = await fetchWithRetry(new URL('http://example.com'))

    expect(result).toEqual({
      ok: true,
      status: 200,
    })
  })

  it('returns value on second try', async () => {
    mockFetch(
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        }),
    )

    const result = await fetchWithRetry(new URL('http://example.com'))

    expect(result).toEqual({
      ok: true,
      status: 200,
    })
  })

  it('returns value on second try if first attempt throws', async () => {
    mockFetch(
      vi
        .fn()
        .mockRejectedValueOnce(new Error('Test error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        }),
    )

    const result = await fetchWithRetry(new URL('http://example.com'))

    expect(result).toEqual({
      ok: true,
      status: 200,
    })
  })

  it('returns not ok response if retries are exhausted', async () => {
    mockFetch(
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        }),
    )

    const result = await fetchWithRetry(new URL('http://example.com'))

    expect(result).toEqual({
      ok: false,
      status: 500,
    })
  })

  it('throws error if retries are exhausted and fetch throws', async () => {
    mockFetch(
      vi
        .fn()
        .mockRejectedValueOnce(new Error('Test error'))
        .mockRejectedValueOnce(new Error('Test error')),
    )

    await expect(fetchWithRetry(new URL('http://example.com'))).rejects.toThrow(
      'Test error',
    )
  })
})
