import { EvmChain } from '@metamask-institutional/defi-adapters/dist/core/constants/chains.js'
import { JsonRpcProvider, getAddress } from 'ethers'
import {
  completeJobs,
  failJobs,
  fetchNextPoolsToProcess,
  insertLogs,
} from './db-queries.js'
import { fetchEvents } from './fetch-events.js'
import type Database from 'better-sqlite3'

const CONCURRENT_BATCHES = 10
const MAX_RANGE_SIZE = 1000

const MAX_BATCH_SIZE: Record<EvmChain, number> = {
  [EvmChain.Ethereum]: 10,
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
  provider: JsonRpcProvider,
  chainId: EvmChain,
  db: Database.Database,
) {
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

    const {
      poolAddresses,
      topic0,
      userAddressIndex,
      targetBlockNumber,
      batchSize,
    } = nextBatch

    for (let i = 0; i < poolAddresses.length; i += batchSize) {
      const contractAddresses = poolAddresses.slice(i, i + batchSize)

      console.log(`${new Date().toISOString()}: Pools batch started`, {
        batchIndex: i / batchSize + 1,
        totalBatches: Math.ceil(poolAddresses.length / batchSize),
        batchSize: contractAddresses.length,
        totalPools: poolAddresses.length,
      })

      try {
        const chunkSize =
          chainId === EvmChain.Bsc || chainId === EvmChain.Fantom
            ? MAX_RANGE_SIZE
            : CONCURRENT_BATCHES

        const ranges = splitRange(0, targetBlockNumber, chunkSize)
        const concurrentRanges = ranges.map(async ({ from, to }) => {
          for await (const logs of fetchEvents({
            provider,
            contractAddresses,
            topics: [topic0, null, null, null],
            fromBlock: from,
            toBlock: to,
          })) {
            const logsToInsert: [string, string][] = []
            for (const log of logs) {
              const contractAddress = getAddress(
                log.address.toLowerCase(),
              ).slice(2)

              const topic = log.topics[userAddressIndex]!

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

            insertLogs(db, logsToInsert)
          }
        })

        await Promise.all(concurrentRanges)

        completeJobs(db, contractAddresses, topic0, userAddressIndex)

        console.log(`${new Date().toISOString()}: Pools batch ended`, {
          batchIndex: i / batchSize + 1,
          totalBatches: Math.ceil(poolAddresses.length / batchSize),
          batchSize: contractAddresses.length,
          totalPools: poolAddresses.length,
        })
      } catch (error) {
        failJobs(db, contractAddresses, topic0, userAddressIndex)

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

    await new Promise((resolve) => setTimeout(resolve, 5000))
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
    topic_0: string
    user_address_index: number
    block_number: number
    status: 'pending' | 'failed'
  }[],
  maxBatchSize: number,
):
  | {
      poolAddresses: string[]
      topic0: string
      userAddressIndex: number
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
    // Group pools by topic_0 and user_address_index
    const groupedPools = pendingPools.reduce(
      (acc, pool) => {
        const key = `${pool.topic_0}#${pool.user_address_index}`
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
      poolAddresses: largestGroup.map((pool) => pool.contract_address),
      topic0: largestGroup[0]!.topic_0,
      userAddressIndex: largestGroup[0]!.user_address_index,
      targetBlockNumber: Math.max(
        ...largestGroup.map((pool) => pool.block_number),
      ),
      batchSize,
    }
  }

  const failedPools = unfinishedPools.filter((pool) => pool.status === 'failed')
  const { contract_address, topic_0, user_address_index, block_number } =
    failedPools[0]!
  return {
    poolAddresses: [contract_address],
    topic0: topic_0,
    userAddressIndex: user_address_index,
    targetBlockNumber: block_number,
    batchSize: 1,
  }
}
