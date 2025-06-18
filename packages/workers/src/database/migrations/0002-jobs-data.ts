import type { Pool } from 'pg'

export default async function (client: Pool) {
  await client.query(
    `ALTER TABLE jobs
     DROP CONSTRAINT IF EXISTS jobs_user_address_index_check,
     ADD COLUMN IF NOT EXISTS event_abi TEXT`,
  )
}
