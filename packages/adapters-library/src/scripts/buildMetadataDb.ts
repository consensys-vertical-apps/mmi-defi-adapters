import { promises as fs } from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'
import { Command } from 'commander'
import partition from 'lodash/partition'
import { parse, print, types, visit } from 'recast'
import { Protocol } from '../adapters/protocols'
import { supportedProtocols } from '../adapters/supportedProtocols'
import { AdaptersController } from '../core/adaptersController'
import { Chain, ChainName } from '../core/constants/chains'
import { IMetadataBuilder } from '../core/decorators/cacheToFile'
import {
  NotImplementedError,
  ProviderMissingError,
} from '../core/errors/errors'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { pascalCase } from '../core/utils/caseConversion'
import { logger } from '../core/utils/logger'
import { writeAndLintFile } from '../core/utils/writeAndLintFile'
import { Json } from '../types/json'
import { getMetadataInvalidAddresses } from './addressValidation'
import { multiChainFilter, multiProtocolFilter } from './commandFilters'
import { sortEntries } from './utils/sortEntries'
import n = types.namedTypes
import b = types.builders

import Database from 'better-sqlite3'
import { ProtocolToken } from '../types/IProtocolAdapter'
import { Erc20Metadata } from '../types/erc20Metadata'

export function buildMetadataDb(
  program: Command,
  chainProviders: Record<Chain, CustomJsonRpcProvider>,
  adaptersController: AdaptersController,
) {
  program
    .command('build-metadata-db')
    .option(
      '-p, --protocols <protocols>',
      'comma-separated protocols filter (e.g. stargate,aave-v2)',
    )
    .option(
      '-c, --chains <chains>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
    )
    .showHelpAfterError()
    .action(async ({ protocols, chains }) => {
      const filterProtocolIds = multiProtocolFilter(protocols)
      const filterChainIds = multiChainFilter(chains)

      await createDatabases()

      for (const [protocolIdKey, supportedChains] of Object.entries(
        supportedProtocols,
      )) {
        const protocolId = protocolIdKey as Protocol
        if (filterProtocolIds && !filterProtocolIds.includes(protocolId)) {
          continue
        }

        for (const [chainIdKey, _] of Object.entries(supportedChains)) {
          const chainId = +chainIdKey as Chain
          if (filterChainIds && !filterChainIds.includes(chainId)) {
            continue
          }

          const provider = chainProviders[chainId]

          if (!provider) {
            logger.error({ chainId }, 'No provider found for chain')
            throw new ProviderMissingError(chainId)
          }

          const chainProtocolAdapters =
            adaptersController.fetchChainProtocolAdapters(chainId, protocolId)

          for (const [_, adapter] of chainProtocolAdapters) {
            if (
              !(
                typeof adapter.getProtocolTokens === 'function' &&
                // private/secret param added at runtime
                //@ts-ignore
                adapter.getProtocolTokens.isCacheToDbDecorated
              )
            ) {
              continue
            }

            // Start time tracking for getProtocolTokens
            console.time(
              `getProtocolTokens-${protocolId}-${adapter.productId}-${chainId}`,
            )

            const metadataDetails = (await adapter
              .getProtocolTokens(true)
              .catch((e) => {
                if (!(e instanceof NotImplementedError)) {
                  throw e
                }
                return undefined
              })) as
              | {
                  metadata: ProtocolToken[]
                  adapterDetails: {
                    protocolId: Protocol
                    productId: string
                    chainId: Chain
                  }
                }
              | undefined

            // End time tracking for getProtocolTokens
            console.timeEnd(
              `getProtocolTokens-${protocolId}-${adapter.productId}-${chainId}`,
            )

            if (!metadataDetails) {
              continue
            }

            const { metadata, adapterDetails } = metadataDetails

            const invalidAddresses = getMetadataInvalidAddresses(metadata)

            if (invalidAddresses.length > 0) {
              console.error(chalk.yellow(invalidAddresses.join('\n')))

              console.error(
                chalk.red(
                  '\n * The above addresses found in the metadata file are not in checksum format.',
                ),
              )
              console.error(
                chalk.green(
                  '\n * Please ensure that addresses are in checksum format by wrapping them with getAddress from the ethers package.',
                ),
              )
              console.error(
                chalk.green(
                  '\n * Please checksum your addresses inside the buildMetadata() method.',
                ),
              )
              return
            }

            await writeProtocolTokensToDb({
              ...adapterDetails,
              metadata,
            })
          }
        }
      }
    })
}

async function writeProtocolTokensToDb({
  protocolId,
  productId,
  chainId,
  metadata,
}: {
  protocolId: Protocol
  productId: string
  chainId: Chain
  metadata: ProtocolToken[] // Array of ProtocolToken objects
}) {
  try {
    const dbPath = path.resolve(`./${ChainName[chainId]}.db`)

    try {
      await fs.access(dbPath)
      logger.info(`Database file already exists: ${dbPath}`)
    } catch {
      logger.info(`Database file does not exist: ${dbPath}`)
      throw `Database file does not exist: ${dbPath}`
    }

    const db = new Database(dbPath)

    // // Enable performance optimizations
    db.exec('PRAGMA synchronous = OFF;') // Reduce disk synchronization overhead
    db.exec('PRAGMA journal_mode = WAL;') // Use Write-Ahead Logging for faster writes
    db.exec('PRAGMA foreign_keys = OFF;') // Disable foreign key constraints temporarily for performance

    // Step 1: Ensure adapter exists or create it
    const insertOrIgnoreAdapterQuery = `
    INSERT OR IGNORE INTO adapters (protocol_id, product_id)
    VALUES (?, ?);
  `
    db.prepare(insertOrIgnoreAdapterQuery).run(protocolId, productId)

    const getAdapterIdQuery = `
    SELECT adapter_id FROM adapters WHERE protocol_id = ? AND product_id = ?;
  `
    const adapter = db
      .prepare(getAdapterIdQuery)
      .get(protocolId, productId) as { adapter_id: string }

    const adapterId = adapter?.adapter_id

    if (!adapterId) {
      throw new Error('Failed to retrieve or create adapter')
    }

    const insertPoolStmt = db.prepare(`
      INSERT INTO pools (
        adapter_id,
        pool_address,
        adapter_pool_id,
        additional_data
      ) VALUES (?, ?, ?, ?);
    `)

    // Define relatedTokenQueries for underlying_tokens, reward_tokens, extra_reward_tokens
    const relatedTokenQueries: Record<string, string> = {
      underlying_tokens: `
        INSERT OR REPLACE INTO underlying_tokens (
          pool_id,
          token_address,
          additional_data
        ) VALUES (?, ?, ?);
      `,
      reward_tokens: `
        INSERT OR REPLACE INTO reward_tokens (
          pool_id,
          token_address,
          additional_data
        ) VALUES (?, ?, ?);
      `,
      extra_reward_tokens: `
        INSERT OR REPLACE INTO extra_reward_tokens (
          pool_id,
          token_address,
          additional_data
        ) VALUES (?, ?, ?);
      `,
    }

    // Use a single transaction for all inserts to boost performance
    db.exec('BEGIN TRANSACTION')

    // Batch insert function
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    function batchInsert(query: string, data: any[][]) {
      const stmt = db.prepare(query)
      const batch = db.transaction((items) => {
        for (const item of items) {
          stmt.run(...item)
        }
      })
      batch(data)
    }

    // Prepare data for tokens batch insert (pools + related tokens)

    const tokenData: [string, string, string, number][] = []
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const relatedTokenData: any[] = []

    // Helper function to collect token data for batch insert
    function collectTokenData(
      poolId: number,
      tokens: Erc20Metadata[] | undefined,
      tableName: string,
    ) {
      if (!tokens || tokens.length === 0) return

      tokens.forEach((token) => {
        // Add token to be inserted into the tokens table
        tokenData.push([
          token.address,
          token.name,
          token.symbol,
          token.decimals,
        ])

        // Add related token to the specific table (underlying_tokens, reward_tokens, etc.)
        relatedTokenData.push({
          tableName,
          values: [
            poolId,
            token.address,
            //@ts-ignore
            // Todo: underlying token type not yet accepting additionalData
            JSON.stringify(token.additionalData || {}),
          ],
        })
      })
    }

    // Process each pool and collect token data
    for (const pool of metadata) {
      try {
        const {
          address,
          tokenId,
          underlyingTokens,
          name,
          symbol,
          decimals,
          // Todo: ProtocolToken type does not yet support rewardTokens and extraRewardTokens
          //@ts-ignore
          rewardTokens,
          // Todo: ProtocolToken type does not yet support rewardTokens and extraRewardTokens
          //@ts-ignore
          extraRewardTokens,
          ...additionalData
        } = pool

        // Add the main token data for pools
        tokenData.push([address, pool.name, pool.symbol, pool.decimals])

        // Insert pool data
        const result = insertPoolStmt.run(
          adapterId,
          address,
          tokenId || null,
          JSON.stringify(additionalData),
        )

        const poolId = result.lastInsertRowid

        if (!poolId) {
          throw new Error('Failed to insert pool')
        }

        // Collect related token data
        collectTokenData(
          poolId as number,
          underlyingTokens,
          'underlying_tokens',
        )
        collectTokenData(poolId as number, rewardTokens, 'reward_tokens')
        collectTokenData(
          poolId as number,
          extraRewardTokens,
          'extra_reward_tokens',
        )
      } catch (error) {
        console.error('Error saving pool to database:', pool, {
          chainId,
          productId,
          protocolId,
          adapterId,
        })
        throw error
      }
    }

    // Batch insert all tokens into the tokens table
    batchInsert(
      `
      INSERT OR REPLACE INTO tokens (
        token_address,
        token_name,
        token_symbol,
        token_decimals
      ) VALUES (?, ?, ?, ?);
    `,
      tokenData,
    )

    // Batch insert related tokens directly into their respective tables
    for (const { tableName, values } of relatedTokenData) {
      const query = relatedTokenQueries[tableName]
      if (query) {
        batchInsert(query, [values])
      }
    }

    // Commit the transaction
    db.exec('COMMIT')

    // Re-enable foreign key constraints after the transaction is complete
    db.exec('PRAGMA foreign_keys = ON;')

    console.log(
      'All protocol tokens and their related tokens have been saved to the database successfully.',
      { protocolId, productId, chainId, pools: metadata.length, adapterId },
    )

    db.close()
  } catch (error) {
    console.error('Error saving protocol tokens to database:', {
      error,
      protocolId,
      productId,
      chainId,
    })
  }
}

const createTableQueries = {
  adapters: `
    CREATE TABLE IF NOT EXISTS adapters (
        adapter_id INTEGER PRIMARY KEY AUTOINCREMENT,
        protocol_id VARCHAR(255),
        product_id VARCHAR(255),
        UNIQUE(protocol_id, product_id)
    );`,
  tokens: `
    CREATE TABLE IF NOT EXISTS tokens (
        token_address VARCHAR(255) PRIMARY KEY,
        token_name VARCHAR(255),
        token_symbol VARCHAR(10),
        token_decimals INT
    );`,
  pools: `
    CREATE TABLE IF NOT EXISTS pools (
        pool_id INTEGER PRIMARY KEY AUTOINCREMENT,
        adapter_id INT,
        pool_address VARCHAR(255),
        adapter_pool_id VARCHAR(255),
        additional_data TEXT,
        FOREIGN KEY (adapter_id) REFERENCES adapters(adapter_id),
        FOREIGN KEY (pool_address) REFERENCES tokens(token_address),
        UNIQUE (pool_address, adapter_pool_id) -- Adjusted to refer to valid columns
    );`,
  underlying_tokens: `
    CREATE TABLE IF NOT EXISTS underlying_tokens (
        pool_id INT,
        token_address VARCHAR(255),
        additional_data TEXT,
        FOREIGN KEY (pool_id) REFERENCES pools(pool_id),
        FOREIGN KEY (token_address) REFERENCES tokens(token_address),
        UNIQUE (pool_id, token_address)
    );`,
  reward_tokens: `
    CREATE TABLE IF NOT EXISTS reward_tokens (
        pool_id INT,
        token_address VARCHAR(255),
        additional_data TEXT,
        FOREIGN KEY (pool_id) REFERENCES pools(pool_id),
        FOREIGN KEY (token_address) REFERENCES tokens(token_address),
        UNIQUE (pool_id, token_address)
    );`,
  extra_reward_tokens: `
    CREATE TABLE IF NOT EXISTS extra_reward_tokens (
        pool_id INT,
        token_address VARCHAR(255),
        additional_data TEXT,
        FOREIGN KEY (pool_id) REFERENCES pools(pool_id),
        FOREIGN KEY (token_address) REFERENCES tokens(token_address),
        UNIQUE (pool_id, token_address)
    );`,
}

async function createDatabase(name: string) {
  try {
    const dbPath = path.resolve(`./${name}.db`)

    try {
      await fs.access(dbPath)
      logger.debug(`Database file already exists: ${dbPath}`)
    } catch {
      logger.debug(`Database file does not exist: ${dbPath}`)
    }

    const db = new Database(dbPath)

    // Create each table and verify its creation
    for (const [tableName, createTableQuery] of Object.entries(
      createTableQueries,
    )) {
      db.exec(createTableQuery)
    }

    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table';`)
      .all()
    logger.debug(`Tables in ${name} database:`, tables)

    db.close()

    // Check if database file exists, if not create it
  } catch (error) {
    logger.error(`Failed to create database or tables for '${name}':`, error)
  }
}

// Function to create databases for each chain
function createDatabases() {
  for (const [chain, name] of Object.entries(ChainName)) {
    createDatabase(name)
  }
}

// Initialize databases
try {
  createDatabases()
} catch (err) {
  console.error('Error creating databases: ', err)
}
