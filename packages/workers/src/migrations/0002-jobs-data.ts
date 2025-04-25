import type { Pool } from 'pg'

export default async function (client: Pool) {
  await client.query(
    `ALTER TABLE jobs
     ALTER COLUMN user_address_index DROP CONSTRAINT jobs_user_address_index_check,
     ADD COLUMN event_abi TEXT`,
  )
}
