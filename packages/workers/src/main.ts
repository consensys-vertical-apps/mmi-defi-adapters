import path from 'node:path'
import { EvmChain } from '@metamask-institutional/defi-adapters'
import { logger } from './logger.js'
import { runner } from './runner.js'

const chainIdInput = process.argv[2]

if (!chainIdInput) {
  logger.error('Chain ID is required')
  process.exit(1)
}

const chainId = Number.parseInt(chainIdInput, 10) as EvmChain

if (!Object.values(EvmChain).includes(chainId)) {
  logger.error({ chainIdInput }, 'Invalid chain ID')
  process.exit(1)
}

const dbDirPath =
  process.env.DB_DIR_PATH ||
  path.resolve(import.meta.dirname, '../../../databases')

await runner(dbDirPath, chainId, 'both')
