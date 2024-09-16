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
      console.log('protocols', protocols)
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
                //@ts-ignore
                adapter.getProtocolTokens.isCacheToDbDecorated
              )
            ) {
              continue
            }

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

    // Step 1: Ensure adapter exists or create it
    const insertOrIgnoreAdapterQuery = `
    INSERT OR IGNORE INTO adapters (protocol_id, product_id)
    VALUES (?, ?);
  `
    db.prepare(insertOrIgnoreAdapterQuery).run(protocolId, productId)

    const getAdapterIdQuery = `
    SELECT adapter_id FROM adapters WHERE protocol_id = ? AND product_id = ?;
  `
    const adapter = db.prepare(getAdapterIdQuery).get(protocolId, productId)
    //@ts-ignore
    const adapterId = adapter?.adapter_id

    if (!adapterId) {
      throw new Error('Failed to retrieve or create adapter')
    }

    // Function to insert a single token into the tokens table
    function insertToken(token: Erc20Metadata) {
      const insertTokenQuery = `
      INSERT OR REPLACE INTO tokens (
        token_address,
        token_name,
        token_symbol,
        token_decimals
      ) VALUES (?, ?, ?, ?);
    `
      db.prepare(insertTokenQuery).run(
        token.address,
        token.name,
        token.symbol,
        token.decimals,
      )
    }

    // Function to insert related tokens into a specific table
    function insertRelatedTokens(
      poolId: number,
      tokens: Erc20Metadata[] | undefined,
      tableName: string,
    ) {
      if (!tokens || tokens.length === 0) return

      const insertRelatedTokenQuery = `
      INSERT OR REPLACE INTO ${tableName} (
        pool_id,
        token_address,
        additional_data
      ) VALUES (?, ?, ?);
    `

      const insertStmt = db.prepare(insertRelatedTokenQuery)

      for (const relatedToken of tokens) {
        try {
          const { name, decimals, symbol, address, ...additionalData } =
            relatedToken
          insertToken({ name, decimals, symbol, address }) // Ensure the related token is also in the tokens table
          insertStmt.run(poolId, address, JSON.stringify(additionalData))
        } catch (error) {
          console.error('Error saving related token to database:', relatedToken)
          throw error
        }
      }
    }

    // Step 2: Iterate over the metadata array and process each ProtocolToken
    for (const pool of metadata) {
      try {
        const {
          name,
          decimals,
          symbol,
          address,
          tokenId,
          underlyingTokens,
          //@ts-ignore
          rewardTokens,
          //@ts-ignore
          extraRewardTokens,
          ...additionalData
        } = pool

        insertToken({ name, decimals, symbol, address })

        const insertPoolQuery = `
        INSERT INTO pools (
          adapter_id,
          pool_address,
          adapter_pool_id,
          additional_data
        ) VALUES (?, ?, ?, ?);
      `

        const result = db
          .prepare(insertPoolQuery)
          .run(
            adapterId,
            address,
            tokenId || null,
            JSON.stringify(additionalData),
          )

        const poolId = result.lastInsertRowid

        if (!poolId) {
          throw new Error('Failed to insert pool')
        }

        // Insert related tokens into the corresponding tables
        insertRelatedTokens(
          poolId as number,
          pool.underlyingTokens,
          'underlying_tokens',
        )

        //@ts-ignore
        if (pool.rewardTokens) {
          //@ts-ignore
          insertRelatedTokens(
            poolId as number,
            //@ts-ignore
            pool.rewardTokens,
            'reward_tokens',
          )
        }

        //@ts-ignore
        if (pool.extraRewardTokens) {
          insertRelatedTokens(
            poolId as number, //@ts-ignore
            pool.extraRewardTokens,
            'extra_reward_tokens',
          )
        }
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
        FOREIGN KEY (pool_address) REFERENCES tokens(token_address)
    );`,
  underlying_tokens: `
    CREATE TABLE IF NOT EXISTS underlying_tokens (
        pool_id INT,
        token_address VARCHAR(255),
        additional_data TEXT,
        FOREIGN KEY (pool_id) REFERENCES pools(pool_id),
        FOREIGN KEY (token_address) REFERENCES tokens(token_address)
    );`,
  reward_tokens: `
    CREATE TABLE IF NOT EXISTS reward_tokens (
        pool_id INT,
        token_address VARCHAR(255),
        additional_data TEXT,
        FOREIGN KEY (pool_id) REFERENCES pools(pool_id),
        FOREIGN KEY (token_address) REFERENCES tokens(token_address)
    );`,
  extra_reward_tokens: `
    CREATE TABLE IF NOT EXISTS extra_reward_tokens (
        pool_id INT,
        token_address VARCHAR(255),
        additional_data TEXT,
        FOREIGN KEY (pool_id) REFERENCES pools(pool_id),
        FOREIGN KEY (token_address) REFERENCES tokens(token_address)
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
