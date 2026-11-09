import { EvmChain } from '@codefi/mmi-defi-adapters'
import * as client from 'prom-client'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyMetricEvent,
  getWorkerMetrics,
  initWorkerMetrics,
} from './counters.js'
import { countUniqueWallets } from './emit.js'
import { isWorkerMetricEvent } from './types.js'

describe('worker metrics', () => {
  beforeEach(() => {
    // Step: reset registry and re-register counters for each test
    client.register.clear()
    initWorkerMetrics()
  })

  describe('initWorkerMetrics', () => {
    it('registers custom counters on the default registry', async () => {
      const metrics = await client.register.metrics()

      expect(metrics).toContain('defi_workers_rpc_calls_total')
      expect(metrics).toContain('defi_workers_wallets_seen_total')
      expect(metrics).toContain('defi_workers_wallets_inserted_total')
      expect(getWorkerMetrics()).not.toBeNull()
    })
  })

  describe('applyMetricEvent', () => {
    it('increments rpc_call counters with labels', async () => {
      applyMetricEvent({
        type: 'metric',
        name: 'rpc_call',
        chainId: EvmChain.Ethereum,
        method: 'eth_getLogs',
        phase: 'historic',
      })
      applyMetricEvent({
        type: 'metric',
        name: 'rpc_call',
        chainId: EvmChain.Ethereum,
        method: 'eth_getLogs',
        phase: 'historic',
        value: 2,
      })

      const metrics = await client.register.metrics()

      expect(metrics).toMatch(
        /defi_workers_rpc_calls_total\{chainId="1",method="eth_getLogs",phase="historic"\} 3/,
      )
    })

    it('increments wallet counters', async () => {
      applyMetricEvent({
        type: 'metric',
        name: 'wallets_seen',
        chainId: EvmChain.Base,
        phase: 'latest',
        value: 4,
      })
      applyMetricEvent({
        type: 'metric',
        name: 'wallets_inserted',
        chainId: EvmChain.Base,
        phase: 'latest',
        value: 2,
      })

      const metrics = await client.register.metrics()

      expect(metrics).toMatch(
        /defi_workers_wallets_seen_total\{chainId="8453",phase="latest"\} 4/,
      )
      expect(metrics).toMatch(
        /defi_workers_wallets_inserted_total\{chainId="8453",phase="latest"\} 2/,
      )
    })
  })

  describe('isWorkerMetricEvent', () => {
    it('returns true for metric events', () => {
      expect(
        isWorkerMetricEvent({
          type: 'metric',
          name: 'rpc_call',
          chainId: EvmChain.Ethereum,
          method: 'eth_blockNumber',
          phase: 'latest',
        }),
      ).toBe(true)
    })

    it('returns false for health progress messages', () => {
      expect(
        isWorkerMetricEvent({
          chainId: EvmChain.Ethereum,
          lastProcessedBlockNumber: 10,
          latestBlockNumber: 11,
        }),
      ).toBe(false)
    })
  })

  describe('countUniqueWallets', () => {
    it('counts case-insensitive unique addresses', () => {
      expect(
        countUniqueWallets([
          { address: '0xAbc' },
          { address: '0xabc' },
          { address: '0xDEF' },
        ]),
      ).toBe(2)
    })
  })
})
