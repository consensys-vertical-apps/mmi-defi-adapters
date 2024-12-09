import fs from 'node:fs'
import path from 'node:path'
import Database, { Database as DatabaseType } from 'better-sqlite3'
import chalk from 'chalk'
import { Command } from 'commander'
import { Protocol } from '../adapters/protocols'
import { supportedProtocols } from '../adapters/supportedProtocols'
import { AdaptersController } from '../core/adaptersController'
import { ZERO_ADDRESS } from '../core/constants/ZERO_ADDRESS'
import { Chain, ChainIdToChainNameMap } from '../core/constants/chains'
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

export function deleteAdapterMetadata(
  program: Command,
  chainProviders: Record<Chain, CustomJsonRpcProvider>,
  adaptersController: AdaptersController,
) {
  program
    .command('delete-adapter-metadata')
    .option(
      '-p, --protocols <protocols>',
      'protocol id (e.g. stargate or aave-v2)',
    )
    .option(
      '-pd, --products <products>',
      'product id (e.g. voting-escrow or market-borrow)',
    )
    .option(
      '-c, --chains <chains>',
      'chains id or name (e.g. ethereum,arbitrum,linea)',
    )
    .showHelpAfterError()
    .action(
      async ({
        protocols,
        products,
        chains,
      }: { protocols: string; products: string; chains: string }) => {
        console.log('Starting deletion process...')
        console.log('Protocols:', protocols)
        console.log('Products:', products)
        console.log('Chains:', chains)

        const filterProtocolIds = multiProtocolFilter(protocols)!
        if (
          !protocols ||
          (filterProtocolIds && filterProtocolIds.length !== 1)
        ) {
          throw new Error('One protocol must be supplied at a time')
        }
        const protocolId = filterProtocolIds.pop()!

        const filterProductIds = products?.split(',')
        if (!products || (filterProductIds && filterProductIds.length !== 1)) {
          throw new Error('One product must be supplied at a time')
        }
        const productId = filterProductIds?.pop()!

        const filterChainIds = multiChainFilter(chains)!
        if (!chains || (filterChainIds && filterChainIds.length !== 1)) {
          throw new Error('One chain must be supplied at a time')
        }
        const chainId = filterChainIds.pop()!

        const db = new Database(`./${ChainIdToChainNameMap[chainId]}.db`, {
          verbose: console.log,
        })

        // Deleting rows in underlying_tokens
        checkAndDelete(
          db,
          `
  SELECT * FROM underlying_tokens
  WHERE pool_id IN (
      SELECT p.pool_id
      FROM adapters a
      JOIN pools p ON p.adapter_id = a.adapter_id
      WHERE a.protocol_id = ? AND a.product_id = ?
  )
  `,
          `
  DELETE FROM underlying_tokens
  WHERE pool_id IN (
      SELECT p.pool_id
      FROM adapters a
      JOIN pools p ON p.adapter_id = a.adapter_id
      WHERE a.protocol_id = ? AND a.product_id = ?
  )
  `,
          [protocolId, productId],
        )

        // Deleting rows in reward_tokens
        checkAndDelete(
          db,
          `
  SELECT * FROM reward_tokens
  WHERE pool_id IN (
      SELECT p.pool_id
      FROM adapters a
      JOIN pools p ON p.adapter_id = a.adapter_id
      WHERE a.protocol_id = ? AND a.product_id = ?
  )
  `,
          `
  DELETE FROM reward_tokens
  WHERE pool_id IN (
      SELECT p.pool_id
      FROM adapters a
      JOIN pools p ON p.adapter_id = a.adapter_id
      WHERE a.protocol_id = ? AND a.product_id = ?
  )
  `,
          [protocolId, productId],
        )

        // Deleting rows in pools
        checkAndDelete(
          db,
          `
  SELECT * FROM pools
  WHERE pool_address IN (
      SELECT p.pool_address
      FROM adapters a
      JOIN pools p ON p.adapter_id = a.adapter_id
      WHERE a.protocol_id = ? AND a.product_id = ?
  )
  `,
          `
  DELETE FROM pools
  WHERE pool_address IN (
      SELECT p.pool_address
      FROM adapters a
      JOIN pools p ON p.adapter_id = a.adapter_id
      WHERE a.protocol_id = ? AND a.product_id = ?
  )
  `,
          [protocolId, productId],
        )

        // Deleting rows in tokens
        checkAndDelete(
          db,
          `
  SELECT * FROM tokens
  WHERE token_address IS NULL OR token_address IN (
      SELECT t.token_address
      FROM tokens t
      WHERE NOT EXISTS (SELECT 1 FROM pools WHERE pool_address = t.token_address)
        AND NOT EXISTS (SELECT 1 FROM underlying_tokens WHERE token_address = t.token_address)
        AND NOT EXISTS (SELECT 1 FROM reward_tokens WHERE token_address = t.token_address)
        AND NOT EXISTS (SELECT 1 FROM extra_reward_tokens WHERE token_address = t.token_address)
  )
  `,
          `
  DELETE FROM tokens
  WHERE token_address IS NULL OR token_address IN (
      SELECT t.token_address
      FROM tokens t
      WHERE NOT EXISTS (SELECT 1 FROM pools WHERE pool_address = t.token_address)
        AND NOT EXISTS (SELECT 1 FROM underlying_tokens WHERE token_address = t.token_address)
        AND NOT EXISTS (SELECT 1 FROM reward_tokens WHERE token_address = t.token_address)
        AND NOT EXISTS (SELECT 1 FROM extra_reward_tokens WHERE token_address = t.token_address)
  )
  `,
          [],
        )

        console.log('Deletion process completed.')

        db.close()
      },
    )
}

// Utility function to log rows to be deleted and verify after deletion
const checkAndDelete = (
  db: DatabaseType,
  selectQuery: string,
  deleteQuery: string,
  params: [Protocol, string] | [],
) => {
  // Count rows before deletion
  const rowsBefore = db.prepare(selectQuery).all(...params)
  console.log(`Rows to be deleted (${rowsBefore.length}):`)
  console.table(rowsBefore)

  // Perform the deletion
  db.prepare(deleteQuery).run(...params)

  // Verify rows after deletion
  const rowsAfter = db.prepare(selectQuery).all(...params)
  console.log(`Rows remaining after deletion (${rowsAfter.length}):`)
  console.table(rowsAfter)
}
