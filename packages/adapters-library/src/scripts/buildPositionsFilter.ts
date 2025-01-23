import { EventEmitter } from 'node:events'
import path from 'node:path'
import Database, { Database as DatabaseType } from 'better-sqlite3'
import { Command } from 'commander'
import { Provider, ethers, getAddress } from 'ethers'
import {
  Chain,
  ChainIdToChainNameMap,
  EvmChain,
} from '../core/constants/chains'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { DefiProvider } from '../defiProvider'
import { multiChainFilter } from './commandFilters'
import { AVERAGE_BLOCKS_PER_DAY } from '../core/constants/AVERAGE_BLOCKS_PER_DAY'
import { AVERAGE_BLOCKS_PER_10_MINUTES } from '../core/constants/AVERAGE_BLOCKS_PER_10_MINS'

/**
 * Indexer command.
 */
/**
 * Sets up the `indexer` command for the provided CLI program.
 * This command indexes blockchain data for specified chains and stores the results in a database.
 *
 * @param program - The CLI program to which the `indexer` command will be added.
 * @param defiProvider - An instance of `DefiProvider` to interact with blockchain data.
 *
 * @command indexer
 * @option -c, --chain <chain> - Optional chain number to filter by (e.g., ethereum, arbitrum, linea).
 * @option -b, --block <block> - Optional block number to start indexing from.
 *
 * @throws Will throw an error if the provided chain filter does not match any known chain.
 *
 * @example
 * ```sh
 * $ npm run indexer -c ethereum -b 12345678
 * ```
 *
 * The command will:
 * - Filter chains based on the provided options.
 * - Create or open a database for each chain.
 * - Retrieve the latest processed block from the database.
 * - Calculate the chain head block number.
 * - Determine the starting block number for indexing.
 * - Log the time behind the head block.
 * - Get the list of DeFi pool addresses to watch.
 * - Save the contract addresses and the first processed block number.
 * - Listen for new blocks and process logs from receipts.
 * - Insert logs and update the latest processed block number in the database.
 */
export function indexer(program: Command, defiProvider: DefiProvider) {
  program
    .command('indexer')
    .option(
      '-c, --chain <chain>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
    )
    .option(
      '-b, --block <block>',
      'optional block number to start indexing from',
    )
    .showHelpAfterError()
    .action(async ({ chain, block }: { chain?: string; block?: string }) => {
      // Command filters
      let filterChainId: EvmChain | undefined = chain
        ? (Number(chain) as EvmChain)
        : undefined
      if (filterChainId && !ChainIdToChainNameMap[filterChainId]) {
        filterChainId = Number(chain) as EvmChain
        throw new Error(`No chain matches the given filter: ${chain}`)
      }
      let startBlockOverride: number | undefined
      if (block) {
        startBlockOverride = Number(block)
        console.log('Starting from block:', startBlockOverride)
      }

      await Promise.all(
        Object.values(EvmChain)
          .filter((chain) => {
            if (filterChainId && filterChainId !== chain) {
              return false
            }

            if (chain === Chain.Fantom) {
              // only have public rpc atm
              return false
            }

            return true
          })
          .map(async (chainId) => {
            // Get the chain name
            const chainName = ChainIdToChainNameMap[chainId]
            console.log('Starting indexer for chains:', chainName)

            // Create or open the database for the chain
            const database = createDatabase(`${chainName}_index_latest_job`)

            // Get the provider for the chain
            const provider = defiProvider.chainProvider.providers[chainId]

            // Get the latest processed block from the database
            const latestProcessedBlockInDb = database
              .prepare(
                `SELECT latest_block_processed FROM ${LATEST_BLOCK_PROCESSED_TABLE}`,
              )
              .get() as { latest_block_processed: number }

            // Get the chain head block number
            const chainHeadBlockNumber = await provider.getBlockNumber()

            let latestBlockNumber: number

            // Determine the starting block number
            switch (true) {
              case !!startBlockOverride:
                latestBlockNumber = startBlockOverride
                break
              case !!latestProcessedBlockInDb?.latest_block_processed:
                latestBlockNumber =
                  latestProcessedBlockInDb.latest_block_processed
                break
              default:
                latestBlockNumber = chainHeadBlockNumber
            }

            // Log the time behind the head block
            logTimeBehindHead(chainId, latestBlockNumber, provider, chainName)

            // Get the list of defi pool addresses to watch
            const defiPoolAddresses = await defiProvider.getSupport({
              filterChainIds: [chainId],
            })

            const watchContractList = new Set<string>()
            for (const pools of Object.values(defiPoolAddresses || {})) {
              for (const pool of pools) {
                for (const address of pool.protocolTokenAddresses?.[chainId] ||
                  []) {
                  watchContractList.add(address.slice(2).toLowerCase())
                }
              }
            }

            console.log(
              `Watching ${watchContractList.size} defi contracts on ${chainName}`,
            )

            // Save the contract addresses and the first processed block number
            saveContractAddressAndFirstProcessedBlockNumber(
              database,
              watchContractList,
              latestBlockNumber,
            )

            const blockNumberEmitter = new EventEmitter()
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
              try {
                const logsToInsert: [string, string][] = []

                // Wait for a new block if the latest block number is greater than the new block mined number
                if (
                  newBlockMinedNumber &&
                  latestBlockNumber > newBlockMinedNumber
                ) {
                  await waitForNewBlock(latestBlockNumber)
                }

                // Fetch receipts with retry logic
                const receipts = await fetchReceiptsWithRetry(
                  provider,
                  latestBlockNumber,
                  chainName,
                )

                if (receipts?.length) {
                  for (const receipt of receipts.flat()) {
                    if (!receipt?.logs) continue
                    for (const log of receipt.logs) {
                      const contractAddress = log.address.slice(2)

                      if (watchContractList.has(contractAddress)) {
                        for (const topic of log.topics) {
                          if (topic.startsWith('0x000000000000000000000000')) {
                            logsToInsert.push([
                              contractAddress.toLowerCase(),
                              topic.slice(-40).toLowerCase(),
                            ])
                          }
                        }
                      }
                    }
                  }

                  // Insert logs and upsert block number
                  if (logsToInsert.length) {
                    insertLogsAndUpsertBlockNumber(
                      database,
                      logsToInsert,
                      latestBlockNumber,
                    )
                  } else {
                    // Update the latest processed block number
                    updateLatestProcessedBlockNumber(
                      database,
                      latestBlockNumber,
                    )
                  }
                }

                latestBlockNumber++

                console.log(
                  `Indexed block ${latestBlockNumber} for ${chainName}`,
                )

                // Log the time behind the head block every 10 minutes
                if (
                  latestBlockNumber % AVERAGE_BLOCKS_PER_10_MINUTES[chainId] ===
                  0
                ) {
                  logTimeBehindHead(
                    chainId,
                    latestBlockNumber,
                    provider,
                    chainName,
                  )
                }
              } catch (error) {
                console.error(
                  { chainId, latestBlockNumber },
                  'Error in indexer',
                )

                logCurlToGetErroredBlock(latestBlockNumber, provider)
                throw error
              }
            }
          }),
      )
    })
}

const LATEST_BLOCK_PROCESSED_TABLE = 'latest_block_processed'
const CONTRACT_START_BLOCK_TABLE = 'contract_start_block'
const LOGS_TABLE = 'logs'

/**
 * Logs the curl command to get the errored block.
 */
function logCurlToGetErroredBlock(
  latestBlockNumber: number,
  provider: CustomJsonRpcProvider,
) {
  console.log(
    `curl -X POST --data '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x${latestBlockNumber.toString(
      16,
    )}", true],"id":1}' -H "Content-Type: application/json" ${
      provider._getConnection().url
    } | jq`,
  )
}

/**
 * Logs the time behind the head block.
 */
async function logTimeBehindHead(
  chainId: Chain,
  processingBlockNumber: number,
  provider: CustomJsonRpcProvider,
  chainName: string,
) {
  const currenHeadBlockNumber = await provider.getBlockNumber()

  const blocksBehind = currenHeadBlockNumber - processingBlockNumber

  const blocksPerHour = AVERAGE_BLOCKS_PER_DAY[chainId] / 24

  const blocksBehindInHours = (blocksBehind / blocksPerHour).toFixed(1)

  console.log(
    `Indexer is ${blocksBehindInHours} hours behind on ${chainName} and ${blocksBehind} blocks behind`,
  )
}

/**
 * Creates a database and ensures required tables exist.
 */
function createDatabase(name: string) {
  const dbTables = {
    [LOGS_TABLE]: `
      CREATE TABLE IF NOT EXISTS ${LOGS_TABLE} (
        contract_address CHAR(40) NOT NULL,
        address CHAR(40) NOT NULL,
        UNIQUE(contract_address, address)
      );`,
    [CONTRACT_START_BLOCK_TABLE]: `
      CREATE TABLE IF NOT EXISTS ${CONTRACT_START_BLOCK_TABLE} (
        contract_address CHAR(40) NOT NULL,
        first_block_number INTEGER NOT NULL,
        PRIMARY KEY (contract_address)
      );`,
    [LATEST_BLOCK_PROCESSED_TABLE]: `
      CREATE TABLE IF NOT EXISTS ${LATEST_BLOCK_PROCESSED_TABLE} (
        id INTEGER PRIMARY KEY,
        latest_block_processed INTEGER NOT NULL
      );`,
  }

  const dbPath = path.resolve(`./${name}.db`)
  const db = new Database(dbPath)

  // Create tables if they don't exist
  for (const [tableName, createTableQuery] of Object.entries(dbTables)) {
    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(tableName)
    if (!tableExists) {
      db.exec(createTableQuery)
    }
  }

  return db
}

/**
 * Saves the contract addresses and the first processed block number in the database.
 */
function saveContractAddressAndFirstProcessedBlockNumber(
  db: DatabaseType,
  addresses: Set<string>,
  blockNumber: number,
) {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO ${CONTRACT_START_BLOCK_TABLE} (contract_address, first_block_number) VALUES (?, ?)`,
  )

  const transaction = db.transaction(
    (addresses: Set<string>, blockNumber: number) => {
      addresses.forEach((address) => {
        stmt.run(address, blockNumber)
      })
    },
  )

  transaction(addresses, blockNumber)
}

/**
 * Updates the latest processed block number in the database.
 */
function updateLatestProcessedBlockNumber(
  db: DatabaseType,
  blockNumber: number,
) {
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO ${LATEST_BLOCK_PROCESSED_TABLE} (id, latest_block_processed) VALUES (1, ?)`,
  )
  stmt.run(blockNumber)
}

/**
 * Inserts logs and upserts the block number in the database.
 */
function insertLogsAndUpsertBlockNumber(
  db: DatabaseType,
  logs: [string, string][],
  blockNumber: number,
) {
  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO ${LOGS_TABLE} (contract_address, address) VALUES (?, ?)`,
  )

  const updateStmt = db.prepare(
    `INSERT OR REPLACE INTO ${LATEST_BLOCK_PROCESSED_TABLE} (id, latest_block_processed) VALUES (1, ?)`,
  )

  const transaction = db.transaction(
    (logs: [string, string][], blockNumber: number) => {
      logs.forEach(([contract, address]) => {
        insertStmt.run(contract, address)
      })
      updateStmt.run(blockNumber)
    },
  )

  transaction(logs, blockNumber)
}

/**
 * Fetch receipts with retry logic.
 */
async function fetchReceiptsWithRetry(
  provider: CustomJsonRpcProvider,
  blockNumber: number,
  chainName: string,
) {
  let retries = 10
  let backoff = 1000 // Initial backoff time in milliseconds
  while (retries > 0) {
    try {
      return await provider.send('eth_getBlockReceipts', [
        `0x${ethers.toBeHex(blockNumber).slice(2).replace(/^0+/, '')}`,
      ])
    } catch (error) {
      retries--
      console.error(
        `Failed to fetch ${chainName} block receipts for block ${blockNumber}, retries left: ${retries}`,
        error,
      )
      if (retries === 0) {
        throw error // Rethrow error if no retries left
      }
      await new Promise((resolve) => setTimeout(resolve, backoff)) // Wait before retrying
      backoff *= 2 // Exponential backoff
    }
  }
}
