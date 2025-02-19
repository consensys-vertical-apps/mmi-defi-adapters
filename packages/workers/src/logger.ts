import { pino } from 'pino'

export const logger = pino({
  msgPrefix: '[Defi Workers] ',
  transport:
    process.env.LOG_PRETTY === 'true' ? { target: 'pino-pretty' } : undefined,
  level: process.env.LOG_LEVEL || 'info',
})
