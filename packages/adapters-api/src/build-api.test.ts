import {
  DefiPositionResponse,
  DefiProvider,
  Support,
} from '@metamask-institutional/defi-adapters'
import { Mocked, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildApi } from './build-api'
import { DbService } from './db-service'
describe('buildApi', () => {
  let app: ReturnType<typeof buildApi>
  let mockDefiProvider: Mocked<DefiProvider>
  let mockDbService: Mocked<DbService>

  beforeEach(() => {
    mockDefiProvider = vi.mocked({
      getPositions: vi.fn(),
      getSupport: vi.fn(),
    } as unknown as DefiProvider)
    mockDbService = vi.mocked({} as unknown as DbService)

    app = buildApi(mockDefiProvider, mockDbService)
  })

  describe('GET /health', () => {
    it('should return Ok', async () => {
      const res = await app.request('/health')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ message: 'ok' })
    })
  })

  describe('GET /positions/:userAddress', () => {
    const userAddress = '0x0000000000000000000000000000000000000001'

    it('should return positions for valid input', async () => {
      const mockPositions = [{ id: 1, value: 100 }]
      mockDefiProvider.getPositions.mockResolvedValue(
        mockPositions as unknown as DefiPositionResponse[],
      )

      const res = await app.request(`/positions/${userAddress}`)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json).toEqual({ data: mockPositions })
      expect(mockDefiProvider.getPositions).toHaveBeenCalledWith({
        userAddress,
      })
    })

    it('should return 400 for invalid input', async () => {
      const res = await app.request('/positions/invalid-address')
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json).toHaveProperty('error')
    })

    it('should return 500 for provider errors', async () => {
      mockDefiProvider.getPositions.mockRejectedValue(
        new Error('Provider error'),
      )

      const res = await app.request(`/positions/${userAddress}`)
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json).toEqual({ error: 'Provider error' })
    })
  })

  describe('GET /support', () => {
    it('should return support data for valid input', async () => {
      const mockSupport = { supported: true }
      mockDefiProvider.getSupport.mockResolvedValue(
        mockSupport as unknown as Support,
      )

      const res = await app.request('/support')
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json).toEqual({ data: mockSupport })
      expect(mockDefiProvider.getSupport).toHaveBeenCalled()
    })

    it('should return 400 for invalid input', async () => {
      const res = await app.request('/support?filterProtocolIds=invalid')
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json).toHaveProperty('error')
    })

    it('should return 500 for provider errors', async () => {
      mockDefiProvider.getSupport.mockRejectedValue(new Error('Provider error'))

      const res = await app.request('/support')
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json).toEqual({ error: 'Provider error' })
    })
  })
})
