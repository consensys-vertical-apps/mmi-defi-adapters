import Database from 'better-sqlite3'
import { ChainIdToChainNameMap, EvmChain } from '../../core/constants/chains'
import { DefiProvider } from '../../defiProvider'
import {
  createDatabases,
  fetchNextPoolsToProcess,
  insertUserPools,
} from './db-queries'
import { fetchEvents } from './fetchEvents'
import { JsonRpcProvider, Network } from 'ethers'

const POOL_BATCH_SIZE = 100

// TODO: This script should not be responsible for inserting the contract entries
async function insertContractEntries(
  defiProvider: DefiProvider,
  chainId: EvmChain,
  db: Database.Database,
) {
  const provider = defiProvider.chainProvider.providers[chainId]

  const currentBlockNumber = await provider.getBlockNumber()

  const defiPoolAddresses = await defiProvider.getSupport({
    filterChainIds: [chainId],
  })

  const protocolTokenAddresses = new Set<string>()
  for (const pools of Object.values(defiPoolAddresses || {})) {
    for (const pool of pools) {
      for (const address of pool.protocolTokenAddresses?.[chainId] || []) {
        protocolTokenAddresses.add(address.slice(2))
      }
    }
  }

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO history_jobs (contract_address, block_number) VALUES (?, ?)',
  )

  const transaction = db.transaction(
    (contractAddresses: string[], currentBlockNumber: number) => {
      contractAddresses.forEach((address) => {
        stmt.run(address, currentBlockNumber)
      })
    },
  )

  transaction(Array.from(protocolTokenAddresses), currentBlockNumber)
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

  const db = createDatabases(`${ChainIdToChainNameMap[chainId]}_index`)

  if (initialize) {
    // TODO: This script should not be responsible for inserting the contract entries
    // TODO: The script should just be responsible for picking up existing DB entries and processing them
    await insertContractEntries(defiProvider, chainId, db)
  }

  console.log(`${new Date().toISOString()}: Building historic cache`)

  while (true) {
    const pendingPools = fetchNextPoolsToProcess(db)

    if (!pendingPools) {
      console.log(`${new Date().toISOString()}: No pending pools`)

      await new Promise((resolve) => setTimeout(resolve, 10000))
      continue
    }

    const { poolAddresses, targetBlockNumber } = pendingPools

    console.log(`${new Date().toISOString()}`, {
      pools: poolAddresses.length,
      targetBlockNumber,
    })

    let poolsProcessedInBatch = 0
    for (let i = 0; i < poolAddresses.length; i += POOL_BATCH_SIZE) {
      const contractAddresses = poolAddresses.slice(i, i + POOL_BATCH_SIZE)
      console.log(
        `${new Date().toISOString()}: Processing batch ${
          i / POOL_BATCH_SIZE + 1
        } with ${contractAddresses.length} pools (${
          poolAddresses.length
        } total)`,
      )

      let counter = 0
      for await (const { logs, fromBlock, toBlock, depth } of fetchEvents({
        provider,
        contractAddresses,
        topics: [null, null, null, null],
        fromBlock: 0,
        toBlock: targetBlockNumber,
      })) {
        counter += logs.length
        console.log(
          `${new Date().toISOString()}: Logs fetched: ${
            logs.length
          } - from ${fromBlock} to ${toBlock} - ${counter} total - depth ${depth}`,
        )

        const logsToInsert: [string, string][] = []
        for (const log of logs) {
          const contractAddress = log.address.slice(2)

          for (const topic of log.topics) {
            if (
              topic.startsWith('0x000000000000000000000000') &&
              topic !==
                '0x0000000000000000000000000000000000000000000000000000000000000000'
            ) {
              logsToInsert.push([contractAddress, topic.slice(-40)])
            }
          }
        }

        insertUserPools(db, logsToInsert, contractAddresses)

        poolsProcessedInBatch += contractAddresses.length

        // console.log(
        //   `${new Date().toISOString()}: Processed ${
        //     contractAddresses.length
        //   } pools (${poolsProcessedInBatch} total) with ${
        //     logsToInsert.length
        //   } entries`,
        // )
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
}
