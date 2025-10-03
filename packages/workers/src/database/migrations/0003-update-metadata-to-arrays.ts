import type { Pool } from 'pg'

export default async function (client: Pool) {
  // Add metadata columns to existing logs table
  // This allows storing multiple metadata values per user (e.g., multiple public keys or token IDs)

  // Add metadata_key and metadata_value columns to logs table
  await client.query(`
    ALTER TABLE logs ADD COLUMN IF NOT EXISTS metadata_key TEXT
  `)

  await client.query(`
    ALTER TABLE logs ADD COLUMN IF NOT EXISTS metadata_value TEXT
  `)

  // Add additionalMetadataArguments column to jobs table
  await client.query(
    'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS additional_metadata_arguments JSONB',
  )

  // Add transformUserAddressType column to jobs table
  await client.query(
    'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS transform_user_address_type TEXT',
  )

  // Remove the existing primary key constraint on (address, contract_address)
  // This allows multiple metadata entries per user-contract pair
  await client.query(`
    ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_pkey
  `)

  // Create a unique constraint on all four columns to ensure row uniqueness
  await client.query(`
    ALTER TABLE logs ADD CONSTRAINT logs_unique_all_columns 
    UNIQUE (address, contract_address, metadata_key, metadata_value)
  `)
}
