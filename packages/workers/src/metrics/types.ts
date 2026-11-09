import type { EvmChain } from '@codefi/mmi-defi-adapters'

/** RPC methods the workers instrument. */
export type RpcMethod =
  | 'eth_getLogs'
  | 'eth_getBlockReceipts'
  | 'eth_blockNumber'

/** Which cache loop produced the metric. */
export type CachePhase = 'historic' | 'latest'

/**
 * Metric events posted from a chain worker thread to the main thread.
 * Counters live only on the main-thread prom-client registry.
 */
export type WorkerMetricEvent =
  | {
      type: 'metric'
      name: 'rpc_call'
      chainId: EvmChain
      method: RpcMethod
      phase: CachePhase
      value?: number
    }
  | {
      type: 'metric'
      name: 'wallets_seen'
      chainId: EvmChain
      phase: CachePhase
      value: number
    }
  | {
      type: 'metric'
      name: 'wallets_inserted'
      chainId: EvmChain
      phase: CachePhase
      value: number
    }

/**
 * Returns true when a worker_threads message is a metric event.
 */
export function isWorkerMetricEvent(
  message: unknown,
): message is WorkerMetricEvent {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    (message as { type: unknown }).type === 'metric' &&
    'name' in message
  )
}
