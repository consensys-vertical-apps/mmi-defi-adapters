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

const POOL_BATCH_SIZE = 100

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

    let poolsAlreadyProcessed = 0
    for (let i = 0; i < poolAddresses.length; i += POOL_BATCH_SIZE) {
      const contractAddresses = poolAddresses.slice(i, i + POOL_BATCH_SIZE)
      console.log(`${new Date().toISOString()}: Processing batch`, {
        batchIndex: i / POOL_BATCH_SIZE + 1,
        totalBatches: Math.ceil(poolAddresses.length / POOL_BATCH_SIZE),
        batchSize: contractAddresses.length,
        totalPools: poolAddresses.length,
        poolsAlreadyProcessed,
      })

      let logsAlreadyProcessed = 0
      for await (const { logs, fromBlock, toBlock, depth } of fetchEvents({
        provider,
        contractAddresses,
        topics: [null, null, null, null],
        fromBlock: 0,
        toBlock: targetBlockNumber,
      })) {
        logsAlreadyProcessed += logs.length
        console.log(`${new Date().toISOString()}: Logs fetched`, {
          logs: logs.length,
          fromBlock,
          toBlock,
          depth,
          logsAlreadyProcessed,
        })

        const logsToInsert: [string, string][] = []
        for (const log of logs) {
          const contractAddress = getAddress(log.address.toLowerCase()).slice(2)

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

        logsAlreadyProcessed += logs.length
      }

      completeJobs(db, contractAddresses)

      poolsAlreadyProcessed += contractAddresses.length
    }

    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
}
