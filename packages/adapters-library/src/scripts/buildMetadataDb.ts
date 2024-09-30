import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import chalk from 'chalk'
import { Command } from 'commander'
import { Protocol } from '../adapters/protocols'
import { supportedProtocols } from '../adapters/supportedProtocols'
import { AdaptersController } from '../core/adaptersController'
import { Chain, ChainName } from '../core/constants/chains'
import {
  NotImplementedError,
  ProviderMissingError,
} from '../core/errors/errors'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { filterMapSync } from '../core/utils/filters'
import { logger } from '../core/utils/logger'
import { IProtocolAdapter, ProtocolToken } from '../types/IProtocolAdapter'
import { Erc20Metadata } from '../types/erc20Metadata'
import { getMetadataInvalidAddresses } from './addressValidation'
import { multiChainFilter, multiProtocolFilter } from './commandFilters'

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

      const dbConnections = createDatabases(filterChainIds)

      try {
        await Promise.allSettled(
          dbConnections.map(async ([chainId, db]) => {
            for (const [protocolIdKey, supportedChains] of Object.entries(
              supportedProtocols,
            )) {
              const protocolId = protocolIdKey as Protocol
              if (
                (filterProtocolIds &&
                  !filterProtocolIds.includes(protocolId)) ||
                !(chainId in supportedChains)
              ) {
                continue
              }

              const provider = chainProviders[chainId]

              if (!provider) {
                logger.error({ chainId }, 'No provider found for chain')
                throw new ProviderMissingError(chainId)
              }

              const chainProtocolAdapters =
                adaptersController.fetchChainProtocolAdapters(
                  chainId,
                  protocolId,
                )

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

                const metadataDetails = await buildAdapterMetadata(adapter)

                if (metadataDetails) {
                  await writeProtocolTokensToDb({
                    ...metadataDetails.adapterDetails,
                    metadata: metadataDetails.metadata,
                    db,
                  })
                }
              }
            }
          }),
        )
      } finally {
        for (const [_, db] of Object.values(dbConnections)) {
          // Re-enable foreign key constraints
          db.exec('PRAGMA foreign_keys = ON;')
          db.close()
        }
      }
    })
}

async function buildAdapterMetadata(adapter: IProtocolAdapter) {
  // Start time tracking for getProtocolTokens
  console.time(
    `getProtocolTokens-${adapter.protocolId}-${adapter.productId}-${adapter.chainId}`,
  )

  const metadataDetails = (await adapter.getProtocolTokens(true).catch((e) => {
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
    `getProtocolTokens-${adapter.protocolId}-${adapter.productId}-${adapter.chainId}`,
  )

  if (!metadataDetails) {
    return
  }

  const invalidAddresses = getMetadataInvalidAddresses(metadataDetails.metadata)

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

  return metadataDetails
}

async function writeProtocolTokensToDb({
  protocolId,
  productId,
  chainId,
  metadata,
  db,
}: {
  protocolId: Protocol
  productId: string
  chainId: Chain
  metadata: ProtocolToken[] // Array of ProtocolToken objects
  db: Database.Database
}) {
  try {
    // Step 1: Ensure adapter exists or create it
    const insertOrIgnoreAdapterQuery = `
    INSERT OR IGNORE INTO adapters (protocol_id, product_id)
    VALUES (?, ?);
  `
    db.prepare(insertOrIgnoreAdapterQuery).run(protocolId, productId)

    const getAdapterIdQuery = `
    SELECT adapter_id FROM adapters WHERE protocol_id = ? AND product_id = ?;
  `
    const adapter = db.prepare(getAdapterIdQuery).get(protocolId, productId) as
      | { adapter_id: string }
      | undefined

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
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT(adapter_id, pool_address)
      DO UPDATE SET
        adapter_pool_id = excluded.adapter_pool_id,
        additional_data = excluded.additional_data;
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
    function batchInsert(query: string, data: unknown[][]) {
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
    const relatedTokenData: {
      tableName: string
      values: [number, string, string]
    }[] = []

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

      let poolId: number | bigint
      try {
        // Insert pool data
        const result = insertPoolStmt.run(
          adapterId,
          address,
          tokenId || null,
          JSON.stringify(additionalData),
        )

        poolId = result.lastInsertRowid
      } catch (error) {
        console.error('Failed to insert pool', pool, {
          chainId,
          productId,
          protocolId,
          adapterId,
        })
        throw error
      }

      // Collect related token data
      collectTokenData(poolId as number, underlyingTokens, 'underlying_tokens')
      collectTokenData(poolId as number, rewardTokens, 'reward_tokens')
      collectTokenData(
        poolId as number,
        extraRewardTokens,
        'extra_reward_tokens',
      )
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

    console.log(
      'All protocol tokens and their related tokens have been saved to the database successfully.',
      { protocolId, productId, chainId, pools: metadata.length, adapterId },
    )
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
        UNIQUE (pool_address, adapter_id)
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

/**
 * Creates and returns database connections for each chain.
 * @param filterChainIds - An optional array of chain IDs to filter the databases.
 * @returns An array of [chainId, database] pairs.
 */
function createDatabases(
  filterChainIds: Chain[] | undefined,
): [Chain, Database.Database][] {
  return filterMapSync(Object.entries(ChainName), ([chainIdKey, chainName]) => {
    const chainId = +chainIdKey as Chain
    if (filterChainIds && !filterChainIds.includes(chainId)) {
      return
    }

    return [chainId, createDatabase(chainName)]
  })
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

    // Enable performance optimizations
    db.exec('PRAGMA synchronous = OFF;') // Reduce disk synchronization overhead
    db.exec('PRAGMA journal_mode = WAL;') // Use Write-Ahead Logging for faster writes
    db.exec('PRAGMA foreign_keys = OFF;') // Disable foreign key constraints temporarily for performance

    return db
  } catch (error) {
    logger.error(`Failed to create database or tables for '${name}':`, error)
    throw error
  }
}
