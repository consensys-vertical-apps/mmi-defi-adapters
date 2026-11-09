import { Counter } from 'prom-client'
import type { WorkerMetricEvent } from './types.js'

type WorkerCounters = {
  rpcCalls: Counter<'chainId' | 'method' | 'phase'>
  walletsSeen: Counter<'chainId' | 'phase'>
  walletsInserted: Counter<'chainId' | 'phase'>
}

let counters: WorkerCounters | null = null

/**
 * Creates (or recreates) worker Prometheus counters on the default register.
 * Call after `register.clear()` so metrics appear in `/metrics` scrapes.
 */
export function initWorkerMetrics(): WorkerCounters {
  // Step: build counters once per registry lifecycle
  counters = {
    rpcCalls: new Counter({
      name: 'defi_workers_rpc_calls_total',
      help: 'Total RPC calls made by DeFi workers',
      labelNames: ['chainId', 'method', 'phase'],
    }),
    walletsSeen: new Counter({
      name: 'defi_workers_wallets_seen_total',
      help: 'Unique wallet addresses observed in log batches before insert',
      labelNames: ['chainId', 'phase'],
    }),
    walletsInserted: new Counter({
      name: 'defi_workers_wallets_inserted_total',
      help: 'Wallet/log rows inserted into the cache database',
      labelNames: ['chainId', 'phase'],
    }),
  }

  return counters
}

/**
 * Applies a worker metric event to the main-thread prom-client counters.
 */
export function applyMetricEvent(event: WorkerMetricEvent): void {
  if (!counters) {
    return
  }

  const chainId = String(event.chainId)
  const value = event.value ?? 1

  // Step: route by event name to the matching counter
  switch (event.name) {
    case 'rpc_call':
      counters.rpcCalls.inc(
        { chainId, method: event.method, phase: event.phase },
        value,
      )
      break
    case 'wallets_seen':
      counters.walletsSeen.inc({ chainId, phase: event.phase }, value)
      break
    case 'wallets_inserted':
      counters.walletsInserted.inc({ chainId, phase: event.phase }, value)
      break
  }
}

/**
 * Returns the current counters, if initialized.
 */
export function getWorkerMetrics(): WorkerCounters | null {
  return counters
}
