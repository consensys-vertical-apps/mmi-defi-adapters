import { EvmChain } from '@codefi/defi-adapters'
import { describe, expect, it, vi } from 'vitest'
import { buildApi } from './build-api'

describe('buildApi', () => {
  const mockHealthyWorkersInfo = {
    [EvmChain.Ethereum]: {
      lastProcessedBlockNumber: 10,
      latestBlockNumber: 10,
      updatedAt: Date.now(),
    },
    [EvmChain.Base]: {
      lastProcessedBlockNumber: 10,
      latestBlockNumber: 11,
      updatedAt: Date.now(),
    },
    [EvmChain.Arbitrum]: {
      updatedAt: Date.now(),
    },
  }

  describe('GET /health', () => {
    it('should return ok when all chains are healthy', async () => {
      const app = buildApi(mockHealthyWorkersInfo)

      const res = await app.request('/health')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        message: 'ok',
        chainHealthReport: [
          {
            chainId: EvmChain.Ethereum,
            lastProcessedBlockNumber: 10,
            latestBlockNumber: 10,
            updatedAt: expect.any(Number),
            blocksLagging: 0,
            healthy: true,
          },
          {
            chainId: EvmChain.Base,
            lastProcessedBlockNumber: 10,
            latestBlockNumber: 11,
            updatedAt: expect.any(Number),
            blocksLagging: 1,
            healthy: true,
          },
          {
            chainId: EvmChain.Arbitrum,
            lastProcessedBlockNumber: undefined,
            latestBlockNumber: undefined,
            updatedAt: expect.any(Number),
            blocksLagging: undefined,
            healthy: true,
          },
        ],
      })
    })

    it('should return unhealthy when at least one chain is unhealthy', async () => {
      const TEN_MINUTES_IN_MS = 600_000

      const mockUnhealthyWorkersInfo = {
        ...mockHealthyWorkersInfo,
        [EvmChain.Linea]: {
          ...mockHealthyWorkersInfo[EvmChain.Ethereum],
          updatedAt: Date.now() - TEN_MINUTES_IN_MS,
        },
      }

      const app = buildApi(mockUnhealthyWorkersInfo)

      const res = await app.request('/health')
      expect(res.status).toBe(500)
      expect(await res.json()).toEqual({
        message: 'unhealthy',
        chainHealthReport: expect.arrayContaining([
          expect.objectContaining({
            chainId: EvmChain.Linea,
            updatedAt: expect.any(Number),
            healthy: false,
          }),
        ]),
      })
    })
  })

  describe('GET /metrics', () => {
    it('should return metrics', async () => {
      const app = buildApi(mockHealthyWorkersInfo)

      const res = await app.request('/metrics')

      expect(res.status).toBe(200)
    })
  })
})
