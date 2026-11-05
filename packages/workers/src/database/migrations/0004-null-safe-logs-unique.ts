import type { Pool } from 'pg'

/**
 * Postgres UNIQUE treats NULLs as distinct, so (addr, contract, NULL, NULL) can
 * be inserted unlimited times. Replace the constraint with a COALESCE-based
 * unique index and collapse existing duplicates first.
 */
export default async function (client: Pool) {
  // Step 1: keep one row per logical key (NULLs treated as empty string)
  await client.query(`
    DELETE FROM logs
    WHERE ctid NOT IN (
      SELECT MIN(ctid)
      FROM logs
      GROUP BY
        address,
        contract_address,
        COALESCE(metadata_key, ''),
        COALESCE(metadata_value, '')
    )
  `)

  // Step 2: drop the NULL-unsafe unique constraint
  await client.query(`
    ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_unique_all_columns
  `)

  // Step 3: enforce uniqueness treating NULL metadata as ''
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS logs_unique_null_safe_idx
    ON logs (
      address,
      contract_address,
      (COALESCE(metadata_key, '')),
      (COALESCE(metadata_value, ''))
    )
  `)
}
