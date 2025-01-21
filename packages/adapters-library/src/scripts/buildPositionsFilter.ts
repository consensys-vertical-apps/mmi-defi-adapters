import path from 'node:path'
import Database, { Database as DatabaseType } from 'better-sqlite3'
import { Command } from 'commander'
import { Provider, ethers, getAddress } from 'ethers'
import {
  Chain,
  ChainIdToChainNameMap,
  EvmChain,
} from '../core/constants/chains'
import { DefiProvider } from '../defiProvider'
import { multiChainFilter } from './commandFilters'
import { EventEmitter } from 'node:events'

const dbs = {
  logs: `
    CREATE TABLE IF NOT EXISTS logs (
      contract_address VARCHAR(40) NOT NULL,
      address VARCHAR(40) NOT NULL,
      UNIQUE(contract_address, address)
    );`,
  latest_job: `
    CREATE TABLE IF NOT EXISTS latest_job (
      contract_address VARCHAR(40) NOT NULL,
      first_block_number INTEGER NOT NULL,
      latest_block_number INTEGER,
      PRIMARY KEY (contract_address)
    );`,
  history_job_block_number: `
    CREATE TABLE IF NOT EXISTS history_job (
      contract_address VARCHAR(40) NOT NULL,
      block_number INTEGER NOT NULL,
      PRIMARY KEY (contract_address)
    );`,
}

/**
 * Creates a database and ensures required tables exist.
 */
function createDatabases(chainName: string, tables: typeof dbs) {
  const createDb = (chainName: string, dbName: string, dbTable: string) => {
    const dbPath = path.resolve(`./${chainName}_${dbName}.db`)
    const db = new Database(dbPath)

    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(dbName)
    if (!tableExists) {
      db.exec(dbTable)
    }

    return db
  }

  return {
    logs: createDb(chainName, 'logs', tables.logs),
    latest_job: createDb(chainName, 'latest_job', tables.latest_job),
    history_job_block_number: createDb(
      chainName,
      'history_job',
      tables.history_job_block_number,
    ),
  }
}

export function indexer(program: Command, defiProvider: DefiProvider) {
  program
    .command('indexer')
    .option(
      '-c, --chains <chains>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
    )
    .showHelpAfterError()
    .action(
      async ({
        protocols,
        products,
        chains,
      }: { protocols?: string; products?: string; chains?: string }) => {
        const filterChainIds = multiChainFilter(chains)
        // create databases for each chain

        await Promise.all(
          Object.values(EvmChain).map(async (chainId) => {
            if (chainId === Chain.Fantom) {
              // only have public node atm
              return
            }

            const blockNumberEmitter = new EventEmitter()

            if (filterChainIds && !filterChainIds.includes(chainId)) {
              return
            }

            const chainName = ChainIdToChainNameMap[chainId]
            const databaseNamePrfix = `${chainName}_index`

            const databases = createDatabases(databaseNamePrfix, dbs)

            const provider = defiProvider.chainProvider.providers[chainId]

            let latestBlockNumber = await provider.getBlockNumber()

            const defiPoolAddresses = await defiProvider.getSupport({
              filterChainIds: [chainId],
            })

            const protocolTokenAddresses = new Set<string>()
            for (const pools of Object.values(defiPoolAddresses || {})) {
              for (const pool of pools) {
                for (const address of pool.protocolTokenAddresses?.[chainId] ||
                  []) {
                  protocolTokenAddresses.add(address.slice(2))
                }
              }
            }

            const insertInitialBlocks = (
              addresses: Set<string>,
              blockNumber: number,
            ) => {
              const stmt = databases.latest_job.prepare(
                'INSERT OR IGNORE INTO latest_job (contract_address, first_block_number) VALUES (?, ?)',
              )

              const transaction = databases.latest_job.transaction(
                (addresses: Set<string>, blockNumber: number) => {
                  addresses.forEach((address) => {
                    stmt.run(address, blockNumber) // Use the pre-prepared statement
                  })
                },
              )

              transaction(addresses, blockNumber)
            }

            insertInitialBlocks(protocolTokenAddresses, latestBlockNumber)

            let newBlockMinedNumber: number = latestBlockNumber
            provider.on('block', (blockNumber) => {
              newBlockMinedNumber = blockNumber
              blockNumberEmitter.emit('newBlock', blockNumber)
              console.log('New block mined:', blockNumber, chainName)
            })

            // Function to wait until the condition is met
            const waitForNewBlock = (
              latestBlockNumber: number,
            ): Promise<number> => {
              return new Promise((resolve) => {
                // Add a listener for the 'newBlock' event
                const listener = (blockNumber: number) => {
                  if (blockNumber >= latestBlockNumber) {
                    blockNumberEmitter.off('newBlock', listener) // Remove the listener
                    resolve(blockNumber) // Resolve the promise
                  }
                }

                blockNumberEmitter.on('newBlock', listener)
              })
            }

            while (true) {
              const updateLatestBlocks = (
                addresses: Set<string>,
                blockNumber: number,
              ) => {
                const stmt = databases.latest_job.prepare(
                  'UPDATE latest_job SET latest_block_number = ? WHERE contract_address = ?',
                )

                const transaction = databases.latest_job.transaction(
                  (addresses: Set<string>, blockNumber: number) => {
                    addresses.forEach((address) => {
                      stmt.run(blockNumber, address) // Use the pre-prepared statement
                    })
                  },
                )

                transaction(addresses, blockNumber)
              }

              try {
                const logsToInsert: [string, string][] = []

                if (latestBlockNumber > newBlockMinedNumber) {
                  await waitForNewBlock(latestBlockNumber)
                }

                let receipts = []
                let retries = 3
                while (retries > 0) {
                  try {
                    receipts = await provider.send('eth_getBlockReceipts', [
                      `0x${ethers
                        .toBeHex(latestBlockNumber)
                        .slice(2)
                        .replace(/^0+/, '')}`,
                    ])
                    break // Exit loop if successful
                  } catch (error) {
                    retries--
                    console.error(
                      `Failed to fetch block receipts for block ${latestBlockNumber}, retries left: ${retries}`,
                      error,
                    )
                    if (retries === 0) {
                      throw error // Rethrow error if no retries left
                    }
                    await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second before retrying
                  }
                }

                if (!receipts || receipts.length === 0) {
                  updateLatestBlocks(protocolTokenAddresses, latestBlockNumber)

                  latestBlockNumber++

                  console.log(
                    `Indexed block ${latestBlockNumber} for ${chainName}`,
                  )
                  continue
                }

                for (const receipt of receipts.flat()) {
                  if (!receipt?.logs) continue
                  for (const log of receipt.logs) {
                    const contractAddress = log.address.slice(2)

                    if (protocolTokenAddresses.has(contractAddress)) {
                      for (const topic of log.topics) {
                        if (topic.startsWith('0x000000000000000000000000')) {
                          logsToInsert.push([contractAddress, topic.slice(-40)])
                        }
                      }
                    }
                  }
                }

                const insertLogs = (logs: [string, string][]) => {
                  const stmt = databases.logs.prepare(
                    'INSERT OR IGNORE INTO logs (contract_address, address) VALUES (?, ?)',
                  )

                  const transaction = databases.logs.transaction(
                    (logs: [string, string][]) => {
                      logs.forEach(([contract, address]) => {
                        stmt.run(contract, address) // Use the pre-prepared statement
                      })
                    },
                  )

                  transaction(logs)
                }

                if (logsToInsert.length > 0) {
                  insertLogs(logsToInsert)
                }

                updateLatestBlocks(protocolTokenAddresses, latestBlockNumber)

                latestBlockNumber++

                console.log(
                  `Indexed block ${latestBlockNumber} for ${chainName}`,
                )
              } catch (error) {
                console.error(
                  { chainId, latestBlockNumber },
                  'Error in indexer',
                )

                console.log(
                  `curl -X POST --data '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x${latestBlockNumber.toString(
                    16,
                  )}", true],"id":1}' -H "Content-Type: application/json" ${
                    provider._getConnection().url
                  } | jq`,
                )
                throw error
              }
            }
          }),
        )
      },
    )
}
