import { parentPort } from 'node:worker_threads'
import type { EvmChain } from '@codefi/mmi-defi-adapters'
import type { CachePhase, RpcMethod, WorkerMetricEvent } from './types.js'

/**
 * Posts a metric event to the main thread when running inside a worker.
 * No-op when `parentPort` is unavailable (e.g. unit tests).
 */
export function emitMetricEvent(event: WorkerMetricEvent): void {
  parentPort?.postMessage(event)
}

/**
 * Emits an RPC call counter increment for the given method.
 */
export function emitRpcCall({
  chainId,
  method,
  phase,
  value = 1,
}: {
  chainId: EvmChain
  method: RpcMethod
  phase: CachePhase
  value?: number
}): void {
  emitMetricEvent({
    type: 'metric',
    name: 'rpc_call',
    chainId,
    method,
    phase,
    value,
  })
}

/**
 * Emits wallet-seen and wallet-inserted counters for a log insert batch.
 */
export function emitWalletInsertMetrics({
  chainId,
  phase,
  walletsSeen,
  walletsInserted,
}: {
  chainId: EvmChain
  phase: CachePhase
  walletsSeen: number
  walletsInserted: number
}): void {
  if (walletsSeen > 0) {
    emitMetricEvent({
      type: 'metric',
      name: 'wallets_seen',
      chainId,
      phase,
      value: walletsSeen,
    })
  }

  if (walletsInserted > 0) {
    emitMetricEvent({
      type: 'metric',
      name: 'wallets_inserted',
      chainId,
      phase,
      value: walletsInserted,
    })
  }
}

/**
 * Counts unique wallet addresses in a log batch (case-insensitive).
 */
export function countUniqueWallets(logs: { address: string }[]): number {
  return new Set(logs.map((log) => log.address.toLowerCase())).size
}
