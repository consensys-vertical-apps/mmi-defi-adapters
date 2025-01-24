import Database from 'better-sqlite3'
import { ChainIdToChainNameMap, EvmChain } from '../../core/constants/chains'
import { DefiProvider } from '../../defiProvider'
import {
  completeJobs,
  createDatabase,
  fetchNextPoolsToProcess,
  insertContractEntries,
  insertLogs,
} from './db-queries'
import { fetchEvents } from './fetchEvents'
import { getAddress, JsonRpcProvider, Network } from 'ethers'
import PQueue from 'p-queue'

const POOL_BATCH_SIZE = 50

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

  const queue = new PQueue({ concurrency: 5 })

  while (true) {
    const pendingPools = fetchNextPoolsToProcess(db)

    if (!pendingPools) {
      console.log(`${new Date().toISOString()}: No pending pools`)

      await new Promise((resolve) => setTimeout(resolve, 10000))
      continue
    }

    const { poolAddresses, targetBlockNumber } = pendingPools

    console.log(`${new Date().toISOString()}: Pending pools need processing`, {
      pools: poolAddresses.length,
      targetBlockNumber,
    })

    const poolBatches = []
    for (let i = 0; i < poolAddresses.length; i += POOL_BATCH_SIZE) {
      const contractAddresses = poolAddresses.slice(i, i + POOL_BATCH_SIZE)

      poolBatches.push(
        queue.add(async () => {
          console.log(`${new Date().toISOString()}: Pools batch started`, {
            batchIndex: i / POOL_BATCH_SIZE + 1,
            totalBatches: Math.ceil(poolAddresses.length / POOL_BATCH_SIZE),
            batchSize: contractAddresses.length,
            totalPools: poolAddresses.length,
          })

          for await (const { logs, fromBlock, toBlock, depth } of fetchEvents({
            provider,
            contractAddresses,
            topics: [null, null, null, null],
            fromBlock: 0,
            toBlock: targetBlockNumber,
          })) {
            // console.log(`${new Date().toISOString()}: Logs fetched`, {
            //   logs: logs.length,
            //   fromBlock,
            //   toBlock,
            //   depth,
            //   batchIndex: i / POOL_BATCH_SIZE + 1,
            // })

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

          completeJobs(db, contractAddresses)

          console.log(`${new Date().toISOString()}: Pools batch ended`, {
            batchIndex: i / POOL_BATCH_SIZE + 1,
            totalBatches: Math.ceil(poolAddresses.length / POOL_BATCH_SIZE),
            batchSize: contractAddresses.length,
            totalPools: poolAddresses.length,
          })

          logMemoryUsage()

          // Hint to garbage collector
          if (global.gc) {
            global.gc()
          }
        }),
      )
    }

    const results = await Promise.allSettled(poolBatches)

    console.log(`${new Date().toISOString()}: Loop completed`, {
      succesfulBatches: results.filter(
        (result) => result.status === 'fulfilled',
      ).length,
      failedBatches: results.filter((result) => result.status === 'rejected')
        .length,
      totalPools: poolAddresses.length,
    })

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
