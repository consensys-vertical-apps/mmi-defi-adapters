import fs from 'node:fs'
import path from 'node:path'
import { Connection } from '@solana/web3.js'
import Database from 'better-sqlite3'
import chalk from 'chalk'
import { Command } from 'commander'
import { Protocol } from '../adapters/protocols'
import { supportedProtocols } from '../adapters/supportedProtocols'
import { AdaptersController } from '../core/adaptersController'
import { ZERO_ADDRESS } from '../core/constants/ZERO_ADDRESS'
import {
  Chain,
  ChainIdToChainNameMap,
  EvmChain,
} from '../core/constants/chains'
import { ProviderMissingError } from '../core/errors/errors'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { filterMapSync } from '../core/utils/filters'
import { logger } from '../core/utils/logger'
import {
  AdditionalMetadataWithReservedFields,
  Erc20ExtendedMetadata,
  IProtocolAdapter,
  ProtocolToken,
} from '../types/IProtocolAdapter'
import { Erc20Metadata } from '../types/erc20Metadata'
import { getInvalidAddresses } from './addressValidation'
import { multiChainFilter, multiProtocolFilter } from './commandFilters'
import erc20Tokens from './coingecko-tokens.json'
import { ethers, getAddress } from 'ethers'
import { DefiProvider } from '../defiProvider'

export function indexer(program: Command, defiProvider: DefiProvider) {
  program
    .command('indexer')
    .showHelpAfterError()
    .action(async () => {
      // Fetch the latest block number
      const latestBlock =
        await defiProvider.chainProvider.providers[1].getBlockNumber()
      console.log(`Latest block: ${latestBlock}`)

      // Define the chunk size and earliest block to process
      const CHUNK_SIZE = 1000
      const EARLIEST_BLOCK = latestBlock - 10000 // Define your earliest block limit

      const db = createDatabase('index')

      // Prepare ERC20 token addresses to ignore
      let erc20TokenAddressesToIgnore: string[] = []

      // Add tokens from CoinGecko's ERC20 token list
      erc20Tokens.forEach((token) => {
        const ethereumAddress = token.platforms?.ethereum
        if (!ethereumAddress) return
        const formattedAddress = getAddress(ethereumAddress)
        erc20TokenAddressesToIgnore.push(formattedAddress)
      })

      // Remove any addresses that overlap with DeFi tokens
      const protocolTokens = Array.from(
        await (await defiProvider.metadataProviders[1].allTokens).values(),
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

      // Save log to the database
      const saveLog = (log: {
        address: string
        data: string
        topics: string[]
      }) => {
        const contractAddress = getAddress(log.address)

        // Filter: Ignore ERC20 token addresses
        if (erc20TokenAddressesToIgnore.includes(contractAddress)) return

        // Filter: Ignore NFT transfer events (data === '0x')
        if (log.data === '0x') return

        // Filter: Ignore events with only topic0
        if (log.topics.length < 2) return

        // Helper function to validate and format Ethereum addresses
        const formatAddress = (topic: string): string | null => {
          try {
            // Ensure the topic starts with the Ethereum address padding prefix
            if (!topic.startsWith('0x000000000000000000000000')) {
              return null
            }

            // Remove leading zeros and validate the address
            const trimmedAddress = topic.replace(
              /^0x000000000000000000000000/,
              '0x',
            )
            return getAddress(trimmedAddress) // Returns checksummed address
          } catch {
            return null // Return null if the address is invalid
          }
        }

        // Format topics
        const formattedTopics = log.topics.map(formatAddress)

        // Insert log into the database
        formattedTopics.forEach((topic) => {
          // Filter: Ignore invalid or null topics
          if (topic === null) return

          // Filter: 0 address
          if (topic === '0000000000000000000000000000000000000000') return

          const insertStmt = db.prepare(`
          INSERT OR IGNORE INTO logs (contract_address, address)
          VALUES (?, ?)
        `)
          insertStmt.run(
            contractAddress.replace(/^0x/, ''),
            topic.replace(/^0x/, ''),
          )
        })
      }

      // Fetch and process logs for a block range
      const processBlockRange = async (
        rangeStart: number,
        rangeEnd: number,
      ) => {
        const promises = []
        for (
          let blockNumber = rangeStart;
          blockNumber >= rangeEnd;
          blockNumber--
        ) {
          promises.push(
            (async (blockNumber) => {
              const receipts =
                await defiProvider.chainProvider.providers[1].send(
                  'eth_getBlockReceipts',
                  [ethers.toBeHex(blockNumber)],
                )
              console.log(`Processing block: ${blockNumber}`)
              for (const receipt of receipts) {
                for (const log of receipt.logs) {
                  saveLog(log)
                }
              }
            })(blockNumber),
          )
        }
        await Promise.all(promises)
      }

      // Insert block ranges into the block_processing table
      const insertBlockRanges = (
        startBlock: number,
        endBlock: number,
        chunkSize: number,
      ) => {
        const insertStmt = db.prepare(`
          INSERT OR IGNORE INTO block_processing (block_range_start, block_range_end, status)
          VALUES (?, ?, 'pending')
        `)

        for (let i = startBlock; i > endBlock; i -= chunkSize) {
          const rangeStart = i
          const rangeEnd = Math.max(i - chunkSize + 1, endBlock)
          insertStmt.run(rangeStart, rangeEnd)
        }
      }

      // Main processing logic
      const startTime = Date.now()
      try {
        // Insert block ranges into the database
        insertBlockRanges(latestBlock, EARLIEST_BLOCK, CHUNK_SIZE)

        // Select and process pending block ranges
        const selectStmt = db.prepare(`
          SELECT block_range_start, block_range_end
          FROM block_processing
          WHERE status = 'pending'
          ORDER BY block_range_start DESC
          LIMIT 1
        `)

        const updateStmt = db.prepare(`
          UPDATE block_processing
          SET status = ?
          WHERE block_range_start = ? AND block_range_end = ?
        `)

        while (true) {
          const range = selectStmt.get()
          if (!range) {
            console.log('No more pending block ranges.')
            break
          }

          const { block_range_start: rangeStart, block_range_end: rangeEnd } =
            range as { block_range_start: number; block_range_end: number }
          console.log(`Processing block range: ${rangeStart} to ${rangeEnd}`)

          try {
            updateStmt.run('in_progress', rangeStart, rangeEnd)
            await processBlockRange(rangeStart, rangeEnd)
            updateStmt.run('completed', rangeStart, rangeEnd)
            console.log(`Completed block range: ${rangeStart} to ${rangeEnd}`)
          } catch (error) {
            console.error(
              `Error processing block range: ${rangeStart} to ${rangeEnd}`,
              error,
            )
            updateStmt.run('failed', rangeStart, rangeEnd)
          }
        }
      } finally {
        db.close()
        const endTime = Date.now()
        const timeTaken = (endTime - startTime) / 1000
        console.log(`Total time taken: ${timeTaken} seconds`)
      }
    })
}

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
 * Creates a database and tables for a given chain.
 * @param name - The name of the chain.
 * @returns The database connection.
 */
function createDatabase(name: string) {
  try {
    const dbPath = path.resolve(`./${name}.db`)

    if (fs.existsSync(dbPath)) {
      logger.debug(`Database file already exists: ${dbPath}`)
    } else {
      logger.debug(`Database file does not exist: ${dbPath}`)
    }

    const db = new Database(dbPath)

    // Create each table and verify its creation
    for (const createTableQuery of Object.values(createTableQueries)) {
      db.exec(createTableQuery)
    }

    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table';`)
      .all()
    logger.debug(`Tables in ${name} database:`, tables)

    return db
  } catch (error) {
    logger.error(`Failed to create database or tables for '${name}':`, error)
    throw error
  }
}
