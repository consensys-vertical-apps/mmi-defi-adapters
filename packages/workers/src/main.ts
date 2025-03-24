import { ChainName, EvmChain } from '@metamask-institutional/defi-adapters'
import { logger, updateLogger } from './logger.js'
import { runner } from './runner.js'

if (!process.env.CHAIN_ID) {
  logger.error('Chain ID is required')
  process.exit(1)
}

const chainId = Number.parseInt(process.env.CHAIN_ID, 10) as EvmChain

if (!Object.values(EvmChain).includes(chainId)) {
  logger.error({ chainId: process.env.CHAIN_ID }, 'Invalid chain ID')
  process.exit(1)
}

updateLogger(chainId, ChainName[chainId])

if (!process.env.DATABASE_URL) {
  logger.error('DATABASE_URL is required')
  process.exit(1)
}

await runner(process.env.DATABASE_URL, chainId)
