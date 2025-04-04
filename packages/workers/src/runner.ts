import {
  Chain,
  DefiProvider,
  EvmChain,
} from '@metamask-institutional/defi-adapters'
import { JsonRpcProvider, Network } from 'ethers'
import type { Logger } from 'pino'
import { buildHistoricCache } from './build-historic-cache.js'
import { buildLatestCache } from './build-latest-cache.js'
import {
  type CacheClient,
  createPostgresCacheClient,
} from './postgres-cache-client.js'

export async function runner(dbUrl: string, chainId: EvmChain, logger: Logger) {
  logger.info('Starting runner')

  const cacheClient = await createPostgresCacheClient({
    dbUrl,
    chainId,
    partialPoolConfig: {
      max: 15,
      connectionTimeoutMillis: 10_000,
    },
    logger,
  })

  // TODO: Remove this once we have support for BSC and Fantom
  if (chainId === Chain.Bsc || chainId === Chain.Fantom) {
    logger.warn('Chain not supported')

    return
  }

  const defiProvider = new DefiProvider()

  const providerUrl =
    defiProvider.chainProvider.providers[chainId]?._getConnection().url

  // TODO: Should exit even before getting this far
  if (!providerUrl) {
    logger.error('Provider missing for this chain')
    return
  }

  const provider = new JsonRpcProvider(providerUrl, chainId, {
    staticNetwork: Network.from(chainId),
  })

  const blockNumber = await getBlockToProcess(cacheClient, provider, logger)

  // TODO: By calling it here, we are only able to add new jobs whenever this script starts
  // If we dynamically call this, we need to ensure that there is no race condition with the historic and latest cache
  const pools = await getPools(defiProvider, chainId)

  const newPools = await cacheClient.insertJobs(pools, blockNumber)

  logger.info({ totalJobs: pools.length, newJobs: newPools }, 'Jobs updated')

  await Promise.all([
    buildHistoricCache(provider, chainId, cacheClient, logger),
    buildLatestCache(provider, chainId, cacheClient, blockNumber, logger),
  ])
}

async function getPools(defiProvider: DefiProvider, chainId: EvmChain) {
  const defiPoolAddresses = await defiProvider.getSupport({
    filterChainIds: [chainId],
  })

  const protocolTokenEntries = new Map<
    string,
    {
      address: string
      topic0: string
      userAddressIndex: number
    }
  >()
  for (const adapterSupportArray of Object.values(defiPoolAddresses || {})) {
    for (const adapterSupport of adapterSupportArray) {
      if (!adapterSupport.userEvent) {
        continue
      }

      for (const address of adapterSupport.protocolTokenAddresses?.[chainId] ||
        []) {
        if (!adapterSupport.userEvent) {
          continue
        }

        const { topic0, userAddressIndex } =
          adapterSupport.userEvent === 'Transfer'
            ? {
                topic0:
                  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                userAddressIndex: 2,
              }
            : adapterSupport.userEvent

        protocolTokenEntries.set(
          `${address.slice(2)}#${topic0}#${userAddressIndex}`,
          {
            address,
            topic0,
            userAddressIndex,
          },
        )
      }
    }
  }

  return Array.from(protocolTokenEntries.values())
}

async function getBlockToProcess(
  cacheClient: CacheClient,
  provider: JsonRpcProvider,
  logger: Logger,
) {
  const dbBlockNumber = await cacheClient.getLatestBlockProcessed()

  if (dbBlockNumber) {
    logger.info({ dbBlockNumber }, 'Last block processed fetched from DB')
    return dbBlockNumber
  }

  try {
    const blockNumber = await provider.getBlockNumber()
    logger.info({ blockNumber }, 'Block number fetched from provider')
    return blockNumber
  } catch (error) {
    logger.error(
      { error, providerUrl: provider._getConnection().url },
      'Error fetching block number',
    )
    process.exit(1)
  }
}
