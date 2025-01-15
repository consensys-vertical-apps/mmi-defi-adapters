import { fork } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import Database, { Database as DatabaseType } from 'better-sqlite3'
import { ethers, getAddress } from 'ethers'
import { Command } from 'commander'
import { DefiProvider } from '../defiProvider'
import erc20Tokens from './coingecko-tokens.json'
import { Chain, EvmChain } from '../core/constants/chains'

const CHUNK_SIZE_PER_CHILD_PROCESS = 200 // Number of blocks per chunk
const MAX_CONCURRENT_INFURA_REQUESTS_PER_CHILD_PROCESS = 50
const MAX_CONCURRENT_PROCESSES = 15 // Maximum child processes
const TOTAL_BLOCKS = 1000000 // Total blocks to process
const CHAIN_ID: EvmChain = 42161 // Ethereum Mainnet
const COINGECKO_CHAINNAME: 'arbitrum-one' | 'ethereum' = 'arbitrum-one'
const DELETE_DB = false
const LATEST_BLOCK_OVERRIDE = 295006391
const PROCESS_ONLY_FAILED_RANGES = false

const createTableQueries = {
  logs: `
    CREATE TABLE IF NOT EXISTS logs (
      contract_address VARCHAR(40) NOT NULL,
      address VARCHAR(40) NOT NULL,
      UNIQUE(contract_address, address)
    );`,
  block_processing: `
    CREATE TABLE IF NOT EXISTS block_processing (
      block_range_start INTEGER NOT NULL,
      block_range_end INTEGER NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      PRIMARY KEY (block_range_start, block_range_end)
    );`,
}

/**
 * Creates a database and ensures required tables exist.
 */
function createDatabase(name: string) {
  const dbPath = path.resolve(`./${name}.db`)
  const db = new Database(dbPath)

  // Apply performance settings
  // Set the journal mode to Write-Ahead Logging (WAL) for better concurrency
  // Default: DELETE
  db.pragma('journal_mode = WAL')

  // Set synchronous mode to OFF for maximum speed at the cost of durability
  // Default: FULL
  db.pragma('synchronous = OFF')

  // Set cache size to ~40 MB (negative value means size in KB)
  // Default: -2000 (2 MB)
  db.pragma('cache_size = -10000')

  // Set locking mode to NORMAL (default)
  // Default: NORMAL
  db.pragma('locking_mode = NORMAL')

  // Set memory-mapped I/O size to 256 MB for faster access
  // Default: 0 (disabled)
  db.pragma('mmap_size = 268435456')

  // Set page size to 64 KB for better performance with large databases
  // Default: 4096 (4 KB)
  db.pragma('page_size = 65536')

  // Apply page size changes and reclaim unused space
  db.exec('VACUUM')

  // Create tables if they don't exist
  for (const [tableName, createTableQuery] of Object.entries(
    createTableQueries,
  )) {
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
 * Pre-creates block ranges for processing and inserts them into the `block_processing` table.
 */
function createBlockRanges(
  db: DatabaseType,
  latestBlock: number,
  earliestBlock: number,
) {
  const insertStmt = db.prepare(`
    INSERT INTO block_processing (block_range_start, block_range_end, status)
    VALUES (?, ?, 'pending')
    ON CONFLICT(block_range_start, block_range_end) DO NOTHING
  `)

  for (
    let i = latestBlock;
    i > earliestBlock;
    i -= CHUNK_SIZE_PER_CHILD_PROCESS
  ) {
    const block_range_start = i
    const block_range_end = Math.max(
      i - CHUNK_SIZE_PER_CHILD_PROCESS + 1,
      earliestBlock,
    )
    insertStmt.run(block_range_start, block_range_end)
  }
}

export function indexer(program: Command, defiProvider: DefiProvider) {
  program
    .command('indexer')
    .showHelpAfterError()
    .action(async () => {
      if (DELETE_DB) {
        const dbPath = path.resolve('./index.db')
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath)
          console.log('Deleted existing database file: index.db')
        }
      }

      const db = createDatabase('index')

      let latestBlock: number

      if (LATEST_BLOCK_OVERRIDE) {
        latestBlock = LATEST_BLOCK_OVERRIDE
      } else {
        latestBlock =
          await defiProvider.chainProvider.providers[CHAIN_ID].getBlockNumber()
      }

      const earliestBlock = latestBlock - TOTAL_BLOCKS

      // console.log(`Processing blocks from ${earliestBlock} to ${latestBlock}`)

      // Pre-create block ranges if needed

      if (!PROCESS_ONLY_FAILED_RANGES) {
        createBlockRanges(db, latestBlock, earliestBlock)
      }

      const activeProcesses = new Set()

      const getNextRange = (): {
        block_range_start: number
        block_range_end: number
      } | null => {
        try {
          const stmt = db.prepare(`
    SELECT block_range_start, block_range_end
    FROM block_processing
    WHERE status = '${PROCESS_ONLY_FAILED_RANGES ? 'failed' : 'pending'}'
    ORDER BY block_range_start DESC
    LIMIT 1
  `)

          const range = stmt.get() as {
            block_range_start: number
            block_range_end: number
          }

          if (range) {
            const updateStmt = db.prepare(`
      UPDATE block_processing
      SET status = 'in_progress'
      WHERE block_range_start = ? AND block_range_end = ?
    `)
            executeWithRetry(() =>
              updateStmt.run(range.block_range_start, range.block_range_end),
            )
          }

          return range
        } catch (error) {
          console.error('Error getting next range:', error)
          throw error
        }
      }

      // Update the status of a block range
      const updateRangeStatusWithRetry = (
        block_range_start: number,
        block_range_end: number,
        status: 'pending' | 'in_progress' | 'failed', // complete status is set with logs insert
      ) => {
        const stmt = db.prepare(`
          UPDATE block_processing
          SET status = ?
          WHERE block_range_start = ? AND block_range_end = ?
        `)

        executeWithRetry(() =>
          stmt.run(status, block_range_start, block_range_end),
        )
      }

      // Process a block range in a child process
      const processRange = (
        range: {
          block_range_start: number
          block_range_end: number
        },
        erc20TokenAddressesToIgnore: string[],
      ) =>
        new Promise<void>((resolve, reject) => {
          const child = fork(__filename) // Fork the current file as a child process

          child.send({ range, erc20TokenAddressesToIgnore }) // Send the block range to the child process

          child.on('message', (message) => {
            console.log(
              `Child process completed range: ${range.block_range_start}-${range.block_range_end}`,
            )
            resolve()
          })

          child.on('error', (err) => {
            console.error(
              `Error in child process for range: ${range.block_range_start}-${range.block_range_end}:`,
              err,
            )
            updateRangeStatusWithRetry(
              range.block_range_start,
              range.block_range_end,
              'failed',
            )

            resolve()
          })

          child.on('exit', (code) => {
            if (code !== 0) {
              console.error(`Child process exited with code ${code}`)
              updateRangeStatusWithRetry(
                range.block_range_start,
                range.block_range_end,
                'failed',
              )
              resolve()
            }
          })
        })

      // Process block ranges with limited concurrency
      const processRanges = async () => {
        // used to know when all child processes have finished
        const promises: Promise<void>[] = []

        const defiProvider = new DefiProvider()

        let erc20TokenAddressesToIgnore: string[] = []
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        erc20Tokens.forEach((token: any) => {
          const ethereumAddress = token.platforms?.[COINGECKO_CHAINNAME]
          if (!ethereumAddress) return
          const formattedAddress = getAddress(ethereumAddress)
          erc20TokenAddressesToIgnore.push(formattedAddress)
        })

        // Remove any addresses that overlap with DeFi tokens
        const protocolTokens = Array.from(
          await (
            await defiProvider.metadataProviders[CHAIN_ID].allTokens
          ).values(),
        )
        const defiTokenAddresses = protocolTokens
          .flat()
          .map((token) => token.address)

        const initialLength = erc20TokenAddressesToIgnore.length
        erc20TokenAddressesToIgnore = erc20TokenAddressesToIgnore.filter(
          (address) => !defiTokenAddresses.includes(address),
        )

        const removedCount = initialLength - erc20TokenAddressesToIgnore.length

        console.log(
          `${removedCount} addresses were removed because they are defi tokens`,
        )

        while (true) {
          if (activeProcesses.size >= MAX_CONCURRENT_PROCESSES) {
            await Promise.race(activeProcesses)
          }

          const range = getNextRange() as {
            block_range_start: number
            block_range_end: number
          }

          // console.log('Processing range:', range)
          if (!range) {
            console.log(
              'No more pending block ranges to start processing. Curently processing:',
              activeProcesses.size,
            )
            break
          }

          const promise = processRange(range, erc20TokenAddressesToIgnore)
          activeProcesses.add(promise)
          promises.push(promise)

          promise.finally(() => activeProcesses.delete(promise))
        }

        await Promise.all(promises)
      }

      const startTime = Date.now()
      await processRanges()
      const endTime = Date.now()

      console.log(
        `Completed processing in ${(endTime - startTime) / 1000} seconds.`,
      )
    })
}

// Child process logic
if (process.send) {
  process.on(
    'message',
    async ({
      range,
      erc20TokenAddressesToIgnore,
    }: {
      range: { block_range_start: number; block_range_end: number }
      erc20TokenAddressesToIgnore: string[]
    }) => {
      const erc20TokenAddressesToIgnoreSet = new Set(
        erc20TokenAddressesToIgnore,
      )

      const defiProvider = new DefiProvider()

      const { block_range_start, block_range_end } = range
      const db = createDatabase('index')

      // Update the status of a block range
      const updateRangeStatusWithRetry = (
        block_range_start: number,
        block_range_end: number,
        status: 'pending' | 'in_progress' | 'failed' | 'completed', // complete status is set with logs insert
      ) => {
        const stmt = db.prepare(`
                      UPDATE block_processing
                      SET status = ?
                      WHERE block_range_start = ? AND block_range_end = ?
                    `)

        executeWithRetry(() =>
          stmt.run(status, block_range_start, block_range_end),
        )
      }

      try {
        async function processInChunks(
          blockRangeStart: number,
          blockRangeEnd: number,
        ) {
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          const receipts: any[] = []
          const chunkSize = MAX_CONCURRENT_INFURA_REQUESTS_PER_CHILD_PROCESS

          // Create an array of block numbers
          const blockNumbers = []
          for (
            let blockNumber = blockRangeStart;
            blockNumber >= blockRangeEnd;
            blockNumber--
          ) {
            blockNumbers.push(blockNumber)
          }

          // Function to process a single chunk
          const processChunk = async (chunk: number[]) => {
            const chunkPromises = chunk.map((blockNumber) =>
              defiProvider.chainProvider.providers[CHAIN_ID].send(
                'eth_getBlockReceipts',
                [ethers.toBeHex(blockNumber)],
              ),
            )
            const chunkReceipts = await Promise.all(chunkPromises)
            receipts.push(...chunkReceipts)
          }

          // Split block numbers into chunks and process each chunk sequentially
          for (let i = 0; i < blockNumbers.length; i += chunkSize) {
            const chunk = blockNumbers.slice(i, i + chunkSize)
            await processChunk(chunk) // Wait for the current chunk to finish
          }

          return receipts
        }

        // Call the function
        const receipts = await processInChunks(
          block_range_start,
          block_range_end,
        )

        const logsToInsert: [string, string][] = []
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        receipts.flat().forEach((receipt: any) => {
          receipt.logs.forEach(
            (log: { address: string; data: string; topics: string[] }) => {
              if (erc20TokenAddressesToIgnoreSet.has(log.address.toLowerCase()))
                return

              log.topics.forEach((topic) => {
                if (topic.startsWith('0x000000000000000000000000')) {
                  logsToInsert.push([log.address.slice(2), topic.slice(-40)])
                }
              })
            },
          )
        })

        const insertLogs = (logs: [string, string][]) => {
          const transaction = db.transaction((logs: [string, string][]) => {
            logs.forEach(([contract, address]) => {
              db.prepare(
                'INSERT OR IGNORE INTO logs (contract_address, address) VALUES (?, ?)',
              ).run(contract, address)
            })
            const stmt = db.prepare(`
              UPDATE block_processing
              SET status = ?
              WHERE block_range_start = ? AND block_range_end = ?
            `)
            stmt.run('completed', block_range_start, block_range_end)
          })
          executeWithRetry(() => transaction(logs))
        }

        if (logsToInsert.length > 0) {
          insertLogs(logsToInsert)
        } else {
          updateRangeStatusWithRetry(
            range.block_range_start,
            range.block_range_end,
            'completed',
          )
        }

        process.send?.({
          block_range_start,
          block_range_end,
          status: 'completed',
        })
      } catch (error) {
        updateRangeStatusWithRetry(
          range.block_range_start,
          range.block_range_end,
          'failed',
        )
        console.error(
          `Error processing range ${block_range_start}-${block_range_end}:`,
          error,
        )
      } finally {
        db.close()
        process.exit()
      }
    },
  )
}

const executeWithRetry = (operation: () => void, retries = 5, delay = 100) => {
  let attempt = 0

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const tryOperation = async (): Promise<any> => {
    try {
      operation()
    } catch (error) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      if (
        error instanceof Error &&
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        (error as any).code === 'SQLITE_BUSY' &&
        attempt < retries
      ) {
        attempt++
        console.warn(`Retrying due to SQLITE_BUSY... Attempt ${attempt}`)
        await new Promise((resolve) => setTimeout(resolve, delay * attempt))
        return tryOperation()
      }
      throw error // Re-throw error if retries are exhausted or not SQLITE_BUSY
    }
  }

  return tryOperation()
}
