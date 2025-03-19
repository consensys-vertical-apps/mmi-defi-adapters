import {
  ChainName,
  DefiProvider,
  EvmChain,
} from '@metamask-institutional/defi-adapters'
import { JsonRpcProvider, Network } from 'ethers'
import { buildHistoricCache } from './build-historic-cache.js'
import { buildLatestCache } from './build-latest-cache.js'
import { createPostgresCacheClient } from './postgres-cache-client.js'

export async function runner(dbUrl: string, chainId: EvmChain) {
  const cacheClient = await createPostgresCacheClient(dbUrl, ChainName[chainId])

  const defiProvider = new DefiProvider()

  const providerUrl =
    defiProvider.chainProvider.providers[chainId]._getConnection().url

  const provider = new JsonRpcProvider(providerUrl, chainId, {
    staticNetwork: Network.from(chainId),
  })

  const blockNumber =
    (await cacheClient.getLatestBlockProcessed()) ??
    (await provider.getBlockNumber())

  // TODO: By calling it here, we are only able to add new jobs whenever this script starts
  // If we dynamically call this, we need to ensure that there is no race condition with the historic and latest cache
  const pools = await getPools(defiProvider, chainId)
  await cacheClient.insertJobs(pools, blockNumber)

  await Promise.all([
    buildHistoricCache(provider, chainId, cacheClient),
    buildLatestCache(provider, chainId, cacheClient, blockNumber),
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
