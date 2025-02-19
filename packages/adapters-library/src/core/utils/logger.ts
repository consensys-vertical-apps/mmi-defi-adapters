import { pino } from 'pino'

export const logger = pino({
  base: { service: 'defi-adapters-library' },
  transport:
    process.env.DEFI_ADAPTERS_LOG_PRETTY === 'true'
      ? { target: 'pino-pretty' }
      : undefined,
  level: process.env.DEFI_ADAPTERS_LOG_LEVEL || 'info',
})
