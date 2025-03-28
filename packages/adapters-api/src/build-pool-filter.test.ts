import { buildPostgresPoolFilter } from '@metamask-institutional/workers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPoolFilter } from './build-pool-filter'

vi.mock('@metamask-institutional/workers', () => ({
  buildPostgresPoolFilter: vi.fn(),
}))

describe('buildPoolFilter', () => {
  it('returns undefined when DEFI_ADAPTERS_USE_POSITIONS_CACHE is not "true"', () => {
    process.env.DEFI_ADAPTERS_USE_POSITIONS_CACHE = 'false'
    const result = buildPoolFilter()
    expect(result).toBeUndefined()
  })

  it('throws error when CACHE_DATABASE_URL is not set but cache is enabled', () => {
    process.env.DEFI_ADAPTERS_USE_POSITIONS_CACHE = 'true'
    // biome-ignore lint/performance/noDelete: setting as undefined does not work for process.env
    delete process.env.CACHE_DATABASE_URL

    expect(() => buildPoolFilter()).toThrow('CACHE_DATABASE_URL is not set')
  })

  it('calls buildPostgresPoolFilter with correct parameters when all env vars are set', () => {
    process.env.DEFI_ADAPTERS_USE_POSITIONS_CACHE = 'true'
    process.env.CACHE_DATABASE_URL =
      'postgresql://test:test@localhost:5432/test'

    const mockPoolFilter = vi.fn()
    vi.mocked(buildPostgresPoolFilter).mockReturnValue(mockPoolFilter)

    const result = buildPoolFilter()

    expect(buildPostgresPoolFilter).toHaveBeenCalledWith({
      dbUrl: 'postgresql://test:test@localhost:5432/test',
      logger: expect.anything(),
    })
    expect(result).toBe(mockPoolFilter)
  })
})
