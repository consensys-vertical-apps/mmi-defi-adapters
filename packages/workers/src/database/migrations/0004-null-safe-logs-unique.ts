import type { Pool } from 'pg'

/**
 * Postgres UNIQUE treats NULLs as distinct, so (addr, contract, NULL, NULL) can
 * be inserted unlimited times. Rebuild `logs` via table swap: copy one row per
 * logical key, add a COALESCE-based unique index, then swap tables.
 *
 * Prefer this over in-place DELETE for large tables (full rewrite vs deleting
 * millions of duplicate rows).
 *
 * Writers are blocked for the whole migration so inserts cannot land on the
 * table that becomes `logs_old` and then get dropped (while
 * `latest_block_processed` may still advance). Reads stay allowed during the
 * long copy/index phase (`SHARE`); `ACCESS EXCLUSIVE` is taken only for the
 * brief rename/drop (required by ALTER/DROP TABLE).
 *
 * Note: search_path / transaction / migrations bookkeeping are handled by the
 * migration runner (per-chain schema). Locks are held until that COMMIT.
 */
export default async function (client: Pool) {
  // Step 1: block writers, allow SELECT, for the copy/index phase
  await client.query(`
    LOCK TABLE logs IN SHARE MODE
  `)

  // Step 2: create empty replacement table (no old unique constraint)
  await client.query(`
    CREATE TABLE logs_new (
      address TEXT NOT NULL,
      contract_address TEXT NOT NULL,
      metadata_key TEXT,
      metadata_value TEXT
    )
  `)

  // Step 3: copy one row per logical key (NULLs treated as ''); keep oldest ctid
  await client.query(`
    INSERT INTO logs_new (address, contract_address, metadata_key, metadata_value)
    SELECT DISTINCT ON (
      address,
      contract_address,
      COALESCE(metadata_key, ''),
      COALESCE(metadata_value, '')
    )
      address,
      contract_address,
      metadata_key,
      metadata_value
    FROM logs
    ORDER BY
      address,
      contract_address,
      COALESCE(metadata_key, ''),
      COALESCE(metadata_value, ''),
      ctid
  `)

  // Step 4: null-safe unique index (matches insertLogs ON CONFLICT target)
  await client.query(`
    CREATE UNIQUE INDEX logs_unique_null_safe_idx
    ON logs_new (
      address,
      contract_address,
      (COALESCE(metadata_key, '')),
      (COALESCE(metadata_value, ''))
    )
  `)

  // Step 5: escalate for rename/drop (ALTER/DROP require ACCESS EXCLUSIVE)
  await client.query(`
    LOCK TABLE logs IN ACCESS EXCLUSIVE MODE
  `)

  // Step 6: atomic rename swap
  await client.query(`
    ALTER TABLE logs RENAME TO logs_old
  `)
  await client.query(`
    ALTER TABLE logs_new RENAME TO logs
  `)

  // Step 7: drop old table (and logs_unique_all_columns with it)
  await client.query(`
    DROP TABLE logs_old
  `)
}
