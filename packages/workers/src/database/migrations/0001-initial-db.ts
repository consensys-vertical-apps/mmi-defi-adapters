import type { Pool } from 'pg'

export default async function (client: Pool) {
  await client.query(
    `CREATE TABLE IF NOT EXISTS logs (
       address TEXT NOT NULL,
       contract_address TEXT NOT NULL,
       PRIMARY KEY (address, contract_address)
     )`,
  )

  await client.query(
    `CREATE TABLE IF NOT EXISTS jobs (
       contract_address TEXT NOT NULL,
       topic_0 TEXT NOT NULL,
       user_address_index INTEGER NOT NULL CHECK (user_address_index IN (1, 2, 3)),
       block_number INTEGER NOT NULL,
       status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
       PRIMARY KEY (contract_address, topic_0, user_address_index)
     )`,
  )

  await client.query(
    `CREATE TABLE IF NOT EXISTS settings (
       key TEXT PRIMARY KEY,
       value TEXT
     )`,
  )

  await client.query(
    `INSERT INTO settings (key, value)
     VALUES ('latest_block_processed', NULL)
     ON CONFLICT DO NOTHING`,
  )
}
