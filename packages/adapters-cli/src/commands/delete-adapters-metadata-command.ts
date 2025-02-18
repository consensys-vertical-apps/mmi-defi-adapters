import Database, { type Database as DatabaseType } from 'better-sqlite3'
import { Command } from 'commander'
import {
  multiProtocolFilter,
  multiChainFilter,
} from '@metamask-institutional/defi-adapters'
import { ChainIdToChainNameMap } from '@metamask-institutional/defi-adapters/dist/core/constants/chains.js'

export function deleteAdapterMetadataCommand(program: Command) {
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

        const db = new Database(
          `./databases/${ChainIdToChainNameMap[chainId]}.db`,
        )

        const poolIds = getPoolIds(db, protocolId, productId)

        // Deleting rows in underlying_tokens
        checkAndDelete(
          db,
          `
  SELECT * FROM underlying_tokens
  WHERE pool_id IN (
      ?
  )
  `,
          `
  DELETE FROM underlying_tokens
  WHERE pool_id IN (
     ?
  )
  `,
          [poolIds],
        )

        // Deleting rows in reward_tokens
        checkAndDelete(
          db,
          `
  SELECT * FROM reward_tokens
  WHERE pool_id IN (
      ?
  )
  `,
          `
  DELETE FROM reward_tokens
  WHERE pool_id IN (
      ?
  )
  `,
          [poolIds],
        )

        // Deleting rows in extra_reward_tokens
        checkAndDelete(
          db,
          `
  SELECT * FROM extra_reward_tokens
  WHERE pool_id IN (
      ?
  )
  `,
          `
  DELETE FROM extra_reward_tokens
  WHERE pool_id IN (
      ?
  )
  `,
          [poolIds],
        )

        // Deleting rows in pools
        checkAndDelete(
          db,
          `
  SELECT * FROM pools
  WHERE pool_id IN (
      ?
  )
  `,
          `
  DELETE FROM pools
  WHERE pool_id IN (
      ?
  )
  `,
          [poolIds],
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
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  params: any[] | [],
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

const getPoolIds = (
  db: DatabaseType,
  protocolId: string,
  productId: string,
): string[] => {
  const query = `
    SELECT p.pool_id
    FROM adapters a
    JOIN pools p ON p.adapter_id = a.adapter_id
    WHERE a.protocol_id = ? AND a.product_id = ?
  `
  const rows = db.prepare(query).all(protocolId, productId) as {
    pool_id: string
  }[]
  return rows.map((row) => row.pool_id)
}
