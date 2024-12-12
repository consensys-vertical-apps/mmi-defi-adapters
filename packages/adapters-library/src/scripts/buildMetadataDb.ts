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

export function buildMetadataDb(
  program: Command,
  chainProviders: Record<EvmChain, CustomJsonRpcProvider>,
  solanaProvider: Connection,
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
          for (const [chainId, db] of dbConnections) {
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

              if (
                (chainId !== Chain.Solana && !chainProviders[chainId]) ||
                (chainId === Chain.Solana && !solanaProvider)
              ) {
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

              // Log when the protocol for a chain is done
              console.log(
                `Finished building metadata for protocol ${protocolId} on chain ${chainId}`,
              )
            }
          }
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

  const invalidAddresses = getInvalidAddresses(metadataDetails)

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

  const invalidPoolAddress = metadataDetails.find(
    (pool) => pool.address === ZERO_ADDRESS,
  )

  if (invalidPoolAddress) {
    console.error(chalk.yellow(invalidPoolAddress.address))

    console.error(
      chalk.red(
        '\n * The above addresses found in the metadata file cannot be a pool address.',
      ),
    )
    console.error(
      chalk.green('\n * Please ensure that address pool address is correct'),
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

type TokenTableName =
  | 'underlying_tokens'
  | 'reward_tokens'
  | 'extra_reward_tokens'

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
  pools: ProtocolToken<
    AdditionalMetadataWithReservedFields & { underlyingTokens: Erc20Metadata[] }
  >[]
  db: Database.Database
}) {
  try {
    db.prepare(`
      INSERT OR IGNORE INTO adapters (protocol_id, product_id)
      VALUES (?, ?);
    `).run(protocolId, productId)

    const adapter = db
      .prepare(`
        SELECT adapter_id FROM adapters WHERE protocol_id = ? AND product_id = ?;
      `)
      .get(protocolId, productId) as { adapter_id: number | bigint } | undefined

    const adapterId = adapter?.adapter_id

    if (!adapterId) {
      throw new Error('Failed to retrieve or create adapter')
    }

    const upsertTokenStmt = db.prepare(`
      INSERT OR REPLACE INTO tokens (
        token_address,
        token_name,
        token_symbol,
        token_decimals
      ) VALUES (?, ?, ?, ?);
    `)

    const upsertPoolTokenStmts: Record<TokenTableName, Database.Statement> = {
      underlying_tokens: db.prepare(`
        INSERT OR REPLACE INTO underlying_tokens (
          pool_id,
          token_address,
          additional_data
        ) VALUES (?, ?, ?);
      `),
      reward_tokens: db.prepare(`
        INSERT OR REPLACE INTO reward_tokens (
          pool_id,
          token_address,
          additional_data
        ) VALUES (?, ?, ?);
      `),
      extra_reward_tokens: db.prepare(`
        INSERT OR REPLACE INTO extra_reward_tokens (
          pool_id,
          token_address,
          additional_data
        ) VALUES (?, ?, ?);
      `),
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
      let poolId: number | bigint
      const poolRowResult = db
        .prepare(`
          SELECT pool_id FROM pools WHERE adapter_id = ? AND pool_address = ? AND (adapter_pool_id = ? OR ? IS NULL)
        `)
        .get(adapterId, address, tokenId ?? null, tokenId ?? null) as
        | { pool_id: number | bigint }
        | undefined

      if (poolRowResult) {
        db.prepare(`
          UPDATE pools SET additional_data = ? WHERE pool_id = ?
        `).run(JSON.stringify(additionalData), poolRowResult.pool_id)

        poolId = poolRowResult.pool_id
      } else {
        const insertResult = db
          .prepare(`
          INSERT INTO pools (
            adapter_id,
            pool_address,
            adapter_pool_id,
            additional_data
          ) VALUES (?, ?, ?, ?)
          RETURNING pool_id;
        `)
          .run(
            adapterId,
            address,
            tokenId ?? null,
            JSON.stringify(additionalData),
          )

        poolId = insertResult.lastInsertRowid
      }

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
    console.error('Error saving protocol tokens to database:', {
      error,
      protocolId,
      productId,
      chainId,
    })
    db.exec('ROLLBACK')
  }
}

// Helper function to collect token data for batch insert
function collectTokenData(
  poolId: number | bigint,
  tokens: Erc20ExtendedMetadata[] | undefined,
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
        UNIQUE (adapter_pool_id, pool_address, adapter_id)
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
  return filterMapSync(
    Object.entries(ChainIdToChainNameMap),
    ([chainIdKey, chainName]) => {
      const chainId = +chainIdKey as Chain
      if (filterChainIds && !filterChainIds.includes(chainId)) {
        return
      }

      return [chainId, createDatabase(chainName)]
    },
  )
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
