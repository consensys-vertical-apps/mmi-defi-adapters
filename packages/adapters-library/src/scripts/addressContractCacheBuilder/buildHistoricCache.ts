import { ChainIdToChainNameMap, EvmChain } from '../../core/constants/chains'
import { DefiProvider } from '../../defiProvider'
import {
  completeJobs,
  createDatabase,
  failJobs,
  fetchNextPoolsToProcess,
  insertContractEntries,
  insertLogs,
} from './db-queries'
import { fetchEvents } from './fetchEvents'
import { getAddress, JsonRpcProvider, Network } from 'ethers'

const MAX_BATCH_SIZE: Record<EvmChain, number> = {
  [EvmChain.Ethereum]: 25,
  [EvmChain.Optimism]: 10,
  [EvmChain.Bsc]: 10,
  [EvmChain.Polygon]: 5,
  [EvmChain.Fantom]: 10,
  [EvmChain.Base]: 10,
  [EvmChain.Arbitrum]: 10,
  [EvmChain.Avalanche]: 10,
  [EvmChain.Linea]: 10,
}

export async function buildHistoricCache(
  defiProvider: DefiProvider,
  chainId: EvmChain,
  initialize: boolean,
) {
  const providerUrl =
    defiProvider.chainProvider.providers[chainId]._getConnection().url

  const provider = new JsonRpcProvider(providerUrl, chainId, {
    staticNetwork: Network.from(chainId),
  })

  const db = createDatabase(`${ChainIdToChainNameMap[chainId]}_index`)

  // TODO: This script should not be responsible for inserting the contract entries
  // TODO: The script should just be responsible for picking up existing DB entries and processing them
  if (initialize) {
    await insertContractEntries(defiProvider, chainId, db)
  }

  while (true) {
    const unfinishedPools = fetchNextPoolsToProcess(db)

    console.log(`${new Date().toISOString()}: Pending pools need processing`, {
      pools: unfinishedPools.length,
    })

    const nextBatch = getNextBatch(unfinishedPools, MAX_BATCH_SIZE[chainId])

    if (!nextBatch) {
      console.log(`${new Date().toISOString()}: No pending pools`)

      await new Promise((resolve) => setTimeout(resolve, 30000))
      continue
    }

    const { poolAddresses, targetBlockNumber, batchSize } = nextBatch

    for (let i = 0; i < poolAddresses.length; i += batchSize) {
      const contractAddresses = poolAddresses.slice(i, i + batchSize)

      console.log(`${new Date().toISOString()}: Pools batch started`, {
        batchIndex: i / batchSize + 1,
        totalBatches: Math.ceil(poolAddresses.length / batchSize),
        batchSize: contractAddresses.length,
        totalPools: poolAddresses.length,
      })

      try {
        const ranges = splitRange(0, targetBlockNumber, 10)
        const concurrentRanges = ranges.map(async ({ from, to }) => {
          for await (const logs of fetchEvents({
            provider,
            contractAddresses,
            topics: [null, null, null, null],
            fromBlock: from,
            toBlock: to,
          })) {
            const logsToInsert: [string, string][] = []
            for (const log of logs) {
              const contractAddress = getAddress(
                log.address.toLowerCase(),
              ).slice(2)

              for (const topic of log.topics) {
                if (
                  topic.startsWith('0x000000000000000000000000') && // Not an address if it is does not start with 0x000000000000000000000000
                  topic !==
                    '0x0000000000000000000000000000000000000000000000000000000000000000' // Skip the zero address
                ) {
                  const topicAddress = getAddress(
                    `0x${topic.slice(-40).toLowerCase()}`,
                  ).slice(2)

                  logsToInsert.push([contractAddress, topicAddress])
                }
              }
            }

            insertLogs(db, logsToInsert)
          }
        })

        await Promise.all(concurrentRanges)

        completeJobs(db, contractAddresses)

        console.log(`${new Date().toISOString()}: Pools batch ended`, {
          batchIndex: i / batchSize + 1,
          totalBatches: Math.ceil(poolAddresses.length / batchSize),
          batchSize: contractAddresses.length,
          totalPools: poolAddresses.length,
        })
      } catch (error) {
        failJobs(db, contractAddresses)

        console.error(`${new Date().toISOString()}: Pools batch failed`, {
          batchIndex: i / batchSize + 1,
          totalBatches: Math.ceil(poolAddresses.length / batchSize),
          batchSize: contractAddresses.length,
          totalPools: poolAddresses.length,
          error,
        })
      }

      logMemoryUsage()
    }

    // console.log(`${new Date().toISOString()}: Loop completed`, {
    //   succesfulBatches: results.filter(
    //     (result) => result.status === 'fulfilled',
    //   ).length,
    //   failedBatches: results.filter((result) => result.status === 'rejected')
    //     .length,
    //   totalPools: poolAddresses.length,
    // })

    await new Promise((resolve) => setTimeout(resolve, 10000))
  }
}

function logMemoryUsage() {
  const used = process.memoryUsage()
  const memoryUsageLog = Object.entries(used).reduce(
    (acc, [key, value]) =>
      `${acc} [${key}: ${Math.round(value / 1024 / 1024)} MB]`,
    'Memory usage:',
  )

  console.log(memoryUsageLog)
}

function splitRange(
  from: number,
  to: number,
  chunks: number,
): { from: number; to: number }[] {
  const totalSize = to - from + 1
  const rangeSize = Math.floor(totalSize / chunks)
  const remainder = totalSize % chunks
  const ranges: { from: number; to: number }[] = []

  for (let i = 0; i < chunks; i++) {
    const start = from + i * rangeSize + Math.min(i, remainder)
    const end = start + rangeSize - 1 + (i < remainder ? 1 : 0)
    ranges.push({ from: start, to: Math.min(end, to) })
  }

  return ranges
}

function getNextBatch(
  unfinishedPools: {
    contract_address: string
    block_number: number
    status: 'pending' | 'failed'
  }[],
  maxBatchSize: number,
):
  | {
      poolAddresses: string[]
      targetBlockNumber: number
      batchSize: number
    }
  | undefined {
  if (unfinishedPools.length === 0) {
    return undefined
  }

  const pendingPools = unfinishedPools.filter(
    (pool) => pool.status === 'pending',
  )

  if (pendingPools.length > 0) {
    const batchSize =
      pendingPools.length <= maxBatchSize * 10
        ? 1
        : pendingPools.length >= maxBatchSize * 100
          ? maxBatchSize
          : Math.max(
              1,
              Math.floor(
                (pendingPools.length - maxBatchSize * 10) /
                  ((maxBatchSize * 100 - maxBatchSize * 10) / maxBatchSize),
              ),
            )

    return {
      poolAddresses: pendingPools.map((pool) => pool.contract_address),
      targetBlockNumber: Math.max(
        ...pendingPools.map((pool) => pool.block_number),
      ),
      batchSize,
    }
  }

  const failedPools = unfinishedPools.filter((pool) => pool.status === 'failed')
  const { contract_address, block_number } = failedPools[0]!
  return {
    poolAddresses: [contract_address],
    targetBlockNumber: block_number,
    batchSize: 1,
  }
}
