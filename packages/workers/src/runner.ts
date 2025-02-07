import { DefiProvider, EvmChain } from '@metamask-institutional/defi-adapters'
import { buildHistoricCache } from './build-historic-cache.js'

const chainId = Number.parseInt(process.argv[2]!, 10) as EvmChain

const defiProvider = new DefiProvider()

console.log(chainId)

// buildHistoricCache(defiProvider, chainId)
