import type { EvmChain } from '@metamask-institutional/defi-adapters'
import { pino } from 'pino'

export let logger = createLogger()

export function updateLogger(chainId: EvmChain, chainName: string) {
  logger = createLogger({ chainId, chainName })
}

function createLogger(base?: { chainId: EvmChain; chainName: string }) {
  return pino({
    base: { ...base, service: 'defi-adapters-workers' },
    transport:
      process.env.LOG_PRETTY === 'true' ? { target: 'pino-pretty' } : undefined,
    level: process.env.LOG_LEVEL || 'info',
  })
}
