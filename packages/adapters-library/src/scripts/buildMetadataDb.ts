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
import { Json } from '../types/json'
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
      '-pd, --products <products>',
      'comma-separated product filter (e.g. voting-escrow,market-borrow)',
    )
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
        const filterProtocolIds = multiProtocolFilter(protocols)
        const filterProductIds = products?.split(',')
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
                    ) ||
                    (filterProductIds &&
                      !filterProductIds.includes(adapter.productId))
                  ) {
                    continue
                  }

                  const pools = await buildAdapterMetadata(adapter)

                  if (pools) {
                    await writeProtocolTokensToDb({
                      protocolId: adapter.protocolId,
                      productId: adapter.productId,
                      chainId: adapter.chainId,
                      pools,
                      db,
                    })
                  }
                }
              }
            }),
          )
        } finally {
          for (const [_, db] of Object.values(dbConnections)) {
            db.close()
          }
        }
      },
    )
}

async function buildAdapterMetadata(adapter: IProtocolAdapter) {
  // Start time tracking for getProtocolTokens
  console.time(
    `getProtocolTokens-${adapter.protocolId}-${adapter.productId}-${adapter.chainId}`,
  )

  const metadataDetails = await adapter.getProtocolTokens(true)

  // End time tracking for getProtocolTokens
  console.timeEnd(
    `getProtocolTokens-${adapter.protocolId}-${adapter.productId}-${adapter.chainId}`,
  )

  const invalidAddresses = getMetadataInvalidAddresses(metadataDetails)

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

const upsertAdapterQuery = `
  INSERT OR IGNORE INTO adapters (protocol_id, product_id)
  VALUES (?, ?);
`

const getAdapterIdQuery = `
  SELECT adapter_id FROM adapters WHERE protocol_id = ? AND product_id = ?;
`

const upsertTokenQuery = `
  INSERT OR REPLACE INTO tokens (
    token_address,
    token_name,
    token_symbol,
    token_decimals
  ) VALUES (?, ?, ?, ?);
`

const upsertPoolQuery = `
  INSERT INTO pools (
    adapter_id,
    pool_address,
    adapter_pool_id,
    additional_data
  ) VALUES (?, ?, ?, ?)
  ON CONFLICT(adapter_id, pool_address)
  DO UPDATE SET
    adapter_pool_id = excluded.adapter_pool_id,
    additional_data = excluded.additional_data
  RETURNING pool_id;
`

type TokenTableName =
  | 'underlying_tokens'
  | 'reward_tokens'
  | 'extra_reward_tokens'

const upsertPoolTokenQueries: Record<TokenTableName, string> = {
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

async function writeProtocolTokensToDb({
  protocolId,
  productId,
  chainId,
  pools,
  db,
}: {
  protocolId: Protocol
  productId: string
  chainId: Chain
  pools: ProtocolToken[] // Array of ProtocolToken objects
  db: Database.Database
}) {
  try {
    // Step 1: Ensure adapter exists or create it
    db.prepare(upsertAdapterQuery).run(protocolId, productId)

    const adapter = db.prepare(getAdapterIdQuery).get(protocolId, productId) as
      | { adapter_id: number | bigint }
      | undefined

    const adapterId = adapter?.adapter_id

    if (!adapterId) {
      throw new Error('Failed to retrieve or create adapter')
    }

    // Step 2: Prepare statements
    const upsertPoolStmt = db.prepare(upsertPoolQuery)
    const upsertTokenStmt = db.prepare(upsertTokenQuery)
    const upsertPoolTokenStmts: Record<TokenTableName, Database.Statement> = {
      underlying_tokens: db.prepare(upsertPoolTokenQueries.underlying_tokens),
      reward_tokens: db.prepare(upsertPoolTokenQueries.reward_tokens),
      extra_reward_tokens: db.prepare(
        upsertPoolTokenQueries.extra_reward_tokens,
      ),
    }

    // Use a single transaction for all inserts to boost performance
    db.exec('BEGIN TRANSACTION')

    const underlyingTokenData: [string, string, string, number][] = []
    const poolTokenData: {
      tableName: TokenTableName
      values: [number | bigint, string, string]
    }[] = []

    // Process each pool and collect token data
    for (const pool of pools) {
      const {
        address,
        name,
        symbol,
        decimals,
        tokenId,
        underlyingTokens,
        rewardTokens,
        extraRewardTokens,
        ...additionalData
      } = pool

      // Insert pool token
      upsertTokenStmt.run([address, name, symbol, decimals])

      // Insert pool
      const { pool_id: poolId } = upsertPoolStmt.get(
        adapterId,
        address,
        tokenId || null,
        JSON.stringify(additionalData),
      ) as { pool_id: number | bigint }

      collectTokenData(
        poolId,
        underlyingTokens,
        'underlying_tokens',
        underlyingTokenData,
        poolTokenData,
      )
      collectTokenData(
        poolId,
        rewardTokens,
        'reward_tokens',
        underlyingTokenData,
        poolTokenData,
      )
      collectTokenData(
        poolId,
        extraRewardTokens,
        'extra_reward_tokens',
        underlyingTokenData,
        poolTokenData,
      )
    }

    for (const [address, name, symbol, decimals] of underlyingTokenData) {
      upsertTokenStmt.run([address, name, symbol, decimals])
    }

    // Batch insert related tokens directly into their respective tables
    for (const { tableName, values } of poolTokenData) {
      const stmt = upsertPoolTokenStmts[tableName]
      batchInsert(db, stmt, [values])
    }

    // Commit the transaction
    db.exec('COMMIT')

    console.log(
      'All protocol tokens and their related tokens have been saved to the database successfully.',
      { protocolId, productId, chainId, pools: pools.length, adapterId },
    )
  } catch (error) {
    db.exec('ROLLBACK')
    console.error('Error saving protocol tokens to database:', {
      error,
      protocolId,
      productId,
      chainId,
    })
  }
}

// Helper function to collect token data for batch insert
function collectTokenData(
  poolId: number | bigint,
  tokens: (Erc20Metadata & Record<string, Json>)[] | undefined,
  tableName: TokenTableName,
  tokenData: [string, string, string, number][],
  poolTokenData: {
    tableName: string
    values: [number | bigint, string, string]
  }[],
) {
  ;(tokens ?? []).forEach(
    ({ address, name, symbol, decimals, ...additionalData }) => {
      // Add token to be inserted into the tokens table
      tokenData.push([address, name, symbol, decimals])

      // Add related token to the specific table (underlying_tokens, reward_tokens, extra_reward_tokens)
      poolTokenData.push({
        tableName,
        values: [poolId, address, JSON.stringify(additionalData)],
      })
    },
  )
}

function batchInsert(
  db: Database.Database,
  stmt: Database.Statement,
  data: unknown[][],
) {
  const batch = db.transaction((items) => {
    for (const item of items) {
      stmt.run(...item)
    }
  })
  batch(data)
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

    return db
  } catch (error) {
    logger.error(`Failed to create database or tables for '${name}':`, error)
    throw error
  }
}
