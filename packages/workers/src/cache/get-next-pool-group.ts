import { EvmChain } from '@metamask-institutional/defi-adapters'
import type { CacheClient } from '../postgres-cache-client.js'

const MaxContractsPerCall: Record<EvmChain, number> = {
  [EvmChain.Ethereum]: 10,
  [EvmChain.Optimism]: 10,
  [EvmChain.Bsc]: 10,
  [EvmChain.Polygon]: 5,
  [EvmChain.Fantom]: 10,
  [EvmChain.Sei]: 10,
  [EvmChain.Base]: 10,
  [EvmChain.Arbitrum]: 10,
  [EvmChain.Avalanche]: 10,
  [EvmChain.Linea]: 10,
}

export async function getNextPoolGroup(
  unfinishedPools: Awaited<ReturnType<CacheClient['fetchUnfinishedJobs']>>,
  chainId: EvmChain,
) {
  if (unfinishedPools.length === 0) {
    return undefined
  }

  const pendingPools = unfinishedPools.filter(
    (pool) => pool.status === 'pending',
  )

  if (pendingPools.length > 0) {
    // Group pools by topic0 and userAddressIndex
    const groupedPools = pendingPools.reduce(
      (acc, pool) => {
        const key = `${pool.topic0}#${pool.userAddressIndex}`
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key]!.push(pool)
        return acc
      },
      {} as Record<string, typeof pendingPools>,
    )

    // Find group with most entries
    const largestGroup = Object.values(groupedPools).reduce(
      (max, group) => (group.length > max.length ? group : max),
      [] as typeof pendingPools,
    )

    const maxBatchSize = MaxContractsPerCall[chainId]

    const batchSize =
      largestGroup.length <= maxBatchSize * 10
        ? 1
        : largestGroup.length >= maxBatchSize * 100
          ? maxBatchSize
          : Math.max(
              1,
              Math.floor(
                (largestGroup.length - maxBatchSize * 10) /
                  ((maxBatchSize * 100 - maxBatchSize * 10) / maxBatchSize),
              ),
            )

    return {
      poolAddresses: largestGroup.map((pool) => pool.contractAddress),
      topic0: largestGroup[0]!.topic0,
      eventAbi: largestGroup[0]!.eventAbi,
      userAddressIndex: largestGroup[0]!.userAddressIndex,
      targetBlockNumber: Math.max(
        ...largestGroup.map((pool) => pool.blockNumber),
      ),
      batchSize,
    }
  }

  const failedPools = unfinishedPools.filter((pool) => pool.status === 'failed')
  const { contractAddress, topic0, eventAbi, userAddressIndex, blockNumber } =
    failedPools[0]!
  return {
    poolAddresses: [contractAddress],
    topic0,
    eventAbi,
    userAddressIndex,
    targetBlockNumber: blockNumber,
    batchSize: 1,
  }
}
