# Worker/Indexer

This document provides complete technical requirements for building a blockchain indexer/worker that supports the MMI DeFi Adapters API. The indexer monitors blockchain events to detect when users acquire positions in 100+ DeFi products, enabling fast position queries.

**Key Requirements**:
- Monitor protocol-specific events across multiple EVM chains
- Extract user addresses (with optional transformations)
- Capture additional metadata (NFT token IDs, validator pubkeys, etc.)
- Support both real-time indexing and historical backfills

**Database Tables**:
- `logs`: User positions (address, contract, metadata)
- `jobs`: Historical indexing tasks (contracts to monitor, event configuration)
- `settings`: Chain state (latest block processed)

**Current Architecture**: Main process with worker threads (one per chain), each running:
- Latest Cache: Follows chain tip in real-time
- Historic Cache: Backfills historical data for new protocols

## Table of Contents

1. [Overview](#overview)
2. [Context](#context)
3. [Architecture](#architecture)
4. [Adapter Settings Configuration](#adapter-settings-configuration)
5. [Configuration Formats](#configuration-formats)
6. [Data Access via API](#data-access-via-api)
7. [Database Requirements](#database-requirements)
8. [Indexing Process](#indexing-process)
9. [User Address Transformations](#user-address-transformations)
10. [Real-World Examples](#real-world-examples)
11. [Worker Architecture](#worker-architecture)
12. [Performance Considerations](#performance-considerations)
13. [Current Reference Implementation](#current-reference-implementation)
14. [SQL Query Examples](#sql-query-examples)
15. [Testing & Validation](#testing--validation)
16. [Troubleshooting Guide](#troubleshooting-guide)
17. [Support & Questions](#support--questions)
18. [Appendix: Complete Type Reference](#appendix-complete-type-reference)

## Overview
Overview of the current event indexing system tracking user DeFi positions across multiple protocols and chains.

## Context
The MMI DeFi Adapters library provides a standardized interface for querying user positions across 100+ DeFi products. To efficiently query user positions, the system requires an indexer/worker that:

1. Monitors blockchain events to detect when users acquire positions in supported DeFi protocols
2. Stores this information in a database that maps user addresses to protocol contract addresses
3. Optionally captures additional metadata (like NFT token IDs, validator pubkeys, etc.)

This database allows the API to quickly determine which protocols a user has interacted with, rather than checking every protocol for every query.

### Current System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  DeFi Adapters Library (TypeScript)                             │
│  ├─ 100+ Protocol Adapters                                      │
│  ├─ Each adapter defines: adapterSettings                       │
│  └─ Exposes: /support API endpoint                              │
└────────────────────────┬────────────────────────────────────────┘
                         │ Configuration
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Worker/Indexer Process                                         │
│  ├─ Reads adapter configuration                                 │
│  ├─ Monitors blockchain events (per chain)                      │
│  ├─ Extracts: user_address, contract_address, metadata          │
│  └─ Stores in PostgreSQL                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │ Writes
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PostgreSQL Database (Schema per Chain)                         │
│  ├─ logs table: (address, contract_address, metadata)           │
│  ├─ jobs table: (contract, event config, status)                │
│  └─ settings table: (latest_block_processed)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │ Reads
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  DeFi Adapters API                                              │
│  ├─ GET /positions/:address                                     │
│  │   └─ Queries DB → Filters adapters → Returns positions      │
│  ├─ GET /user-pools/:address                                    │
│  │   └─ Returns contracts user has interacted with             │
│  └─ GET /support                                                │
│      └─ Returns all protocol configurations                     │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Example

```
User stakes ETH in Ethereum 2.0:
1. Transaction emits: DepositEvent(pubkey, withdrawal_credentials, ...)
2. Worker detects event on block N
3. Worker extracts:
   - withdrawal_credentials → transforms to user address
   - pubkey → stores as metadata
4. Worker inserts: (user_address, contract_address, "pubkey", "0x...")
5. API query for user_address:
   - DB returns: contract + pubkey
   - API calls only ETH2 adapter
   - Adapter uses pubkey to fetch validator balance
   - Returns position to user
```

## Architecture

### High-Level Flow
```
Adapter Settings (TypeScript) 
    ↓
API `/support` endpoint exposes configuration
    ↓
Worker/Indexer reads configuration
    ↓
Worker monitors blockchain events
    ↓
Database stores: (user_address, contract_address, [optional_metadata])
    ↓
API queries database to filter relevant protocols per user
    ↓
API calls specific adapters with metadata
```

## Adapter Settings Configuration

Each DeFi protocol adapter in the library defines an `adapterSettings` property that specifies:
- Whether the protocol should be indexed
- Which blockchain event indicates a user acquired a position
- Which event argument contains the user address
- Optional metadata to extract and store

### TypeScript Type Definition

Reference: `packages/adapters-library/src/types/adapter.ts:84-129`

```typescript
export type AdapterSettings = {
  includeInUnwrap: boolean
  version?: number
  userEvent:
    | {
        /**
         * The keccak256 hash of the event signature to track
         * Must be a hex string starting with "0x"
         */
        topic0: `0x${string}`

        /**
         * The index of the user address that would have acquired a position (1-3)
         * For example, in Transfer(address from, address to, uint256 value) userAddressIndex is 2
         */
        userAddressIndex: 1 | 2 | 3
      }
    | {
        /**
         * The abi of the event to track e.g. "event Borrow(address borrower, uint borrowAmount, uint accountBorrows, uint totalBorrows)"
         */
        eventAbi: `event ${string}(${string})`

        /**
         * The argument of the event that represents the user address
         * e.g. "borrower" in the example above
         */
        userAddressArgument: string
        /**
         * Optional transformation type to convert the raw user address value before using it
         * Useful for cases where the event argument is not directly an address (e.g., bytes that contain an address)
         * Available types: 'eth2-withdrawal-credentials'
         */
        transformUserAddressType?: string
        /**
         * Optional additional metadata configuration that gets mapped to tokenId
         * Specifies the event argument name and transformation type for additional metadata
         * For example: { argumentName: "pubkey", transformMetadataType: "hex-to-base64" }
         * Note: The underlying implementation supports multiple metadata for future expansion
         * Note: The transformMetadataType value is stored in the database for future transformation support
         */
        additionalMetadataArguments?: AdditionalMetadataConfig
      }
    | 'Transfer'
    | false
}

export type AdditionalMetadataConfig = {
  argumentName: string
  transformMetadataType: undefined // currently only support no transformation
}
```

## Configuration Formats

### Format 1: Standard ERC20/ERC721 Transfer Events
**Use Case**: Most token-based protocols (LP tokens, wrapped tokens, staking tokens)

```typescript
adapterSettings = {
  userEvent: 'Transfer'
}
```

**Indexing Requirements**:
- Monitor standard `Transfer(address indexed from, address indexed to, uint256 value)` events
- Extract user address from `to` parameter (topic index 2)
- Topic0: `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`

### Format 2: Custom Event with Topic0 Hash
**Use Case**: Protocols with custom events where user address is indexed

```typescript
adapterSettings = {
  userEvent: {
    topic0: '0x861a4138e41fb21c121a7dbb1053df465c837fc77380cc7226189a662281be2c',
    userAddressIndex: 2
  }
}
```

**Indexing Requirements**:
- Monitor events matching the specific topic0 hash
- Extract user address from the specified indexed parameter (1, 2, or 3)
- The user address is already indexed in the event logs

**Example**: Metamask Pooled Staking deposit events

### Format 3: Event ABI with Non-Indexed Parameters
**Use Case**: Protocols where user address is not indexed, or requires transformation

```typescript
adapterSettings = {
  userEvent: {
    eventAbi: 'event DepositEvent(bytes pubkey, bytes withdrawal_credentials, bytes amount, bytes signature, bytes index)',
    userAddressArgument: 'withdrawal_credentials',
    transformUserAddressType: 'eth2-withdrawal-credentials',
    additionalMetadataArguments: {
      argumentName: 'pubkey',
      transformMetadataType: undefined
    }
  }
}
```

**Indexing Requirements**:
- Parse event ABI to get topic0: `keccak256("DepositEvent(bytes,bytes,bytes,bytes,bytes)")`
- Decode event data to extract `withdrawal_credentials` parameter
- Apply transformation function `eth2-withdrawal-credentials` to convert bytes to address
- Extract `pubkey` parameter as additional metadata
- Store: (transformed_address, contract_address, { pubkey: "0x..." })

**Example**: Ethereum 2.0 Validator Staking (Beacon Chain Deposit Contract)

### Format 4: Event ABI with Additional Metadata
**Use Case**: NFT-based positions where we need to track specific token IDs

```typescript
adapterSettings = {
  userEvent: {
    eventAbi: 'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
    userAddressArgument: 'to',
    additionalMetadataArguments: {
      argumentName: 'tokenId',
      transformMetadataType: undefined
    }
  }
}
```

**Indexing Requirements**:
- Parse event ABI to get topic0
- Extract user address from `to` parameter
- Extract `tokenId` parameter as additional metadata
- Store: (user_address, contract_address, { tokenId: "123" })

**Example**: Uniswap V4 NFT positions

### Format 5: No Event Tracking
**Use Case**: Protocols that don't support event-based indexing (external APIs, special logic)

```typescript
adapterSettings = {
  userEvent: false
}
```

**Indexing Requirements**:
- Do not index any events for this protocol
- API will call adapter's `getTokenIds()` method directly

**Example**: Protocols using external APIs, view-only functions, or complex detection logic

## Data Access via API

### Endpoint: `/support`
Returns all supported protocols with their configuration.

**URL**: `GET /support`

**Response Structure**:
```typescript
{
  [Protocol.UniswapV4]: {
    protocolDetails: {
      chainId: Chain.Ethereum,
      protocolId: Protocol.UniswapV4,
      productId: "pool",
      positionType: PositionType.Supply,
      name: "Uniswap V4",
      description: "...",
      // ... other metadata
    },
    chains: [Chain.Ethereum],
    protocolTokenAddresses: ["0x...", "0x..."], // Contract addresses to monitor
    userEvent: {
      eventAbi: "event Transfer(...)",
      userAddressArgument: "to",
      additionalMetadataArguments: {
        argumentName: "tokenId",
        transformMetadataType: undefined
      }
    }
  },
  // ... other protocols
}
```

### Endpoint: `/user-pools/:userAddress`
Returns the contracts a user has interacted with (based on indexed logs).

**URL**: `GET /user-pools/0x1234567890123456789012345678901234567890`

**Response Structure**:
```typescript
{
  data: {
    [Chain.Ethereum]: {
      contractAddresses: ["0xAAA...", "0xBBB..."],
      metadata: {
        "0xAAA...": ["0xpubkey1", "0xpubkey2"],  // ETH2 validator pubkeys
        "0xBBB...": ["123", "456"]               // Token IDs
      }
    },
    [Chain.Polygon]: ["0xCCC...", "0xDDD..."]  // No metadata
  }
}
```

**Notes**:
- Chains with metadata return an object with `contractAddresses` and `metadata`
- Chains without metadata return just an array of contract addresses
- This endpoint reads directly from the `logs` table
- Used by the API to optimize position queries

### Building Index Mappings
The worker should call `/support?includeProtocolTokens=true` (or access the library directly) and use the `buildTokenEventMappings` pattern:

```typescript
// For each protocol/contract combination, extract:
{
  contractAddress: "0x...",
  topic0: "0x...",              // keccak256 of event signature
  userAddressIndex: 2,          // Which parameter has the user address
  eventAbi?: "event Transfer(...)",  // If using ABI format
  additionalMetadataArguments?: {
    argumentName: "tokenId",
    transformMetadataType: undefined
  },
  transformUserAddressType?: "eth2-withdrawal-credentials"
}
```

## Database Requirements

### Database Structure
The system uses PostgreSQL with a **schema-per-chain** approach:
- Each blockchain has its own schema (e.g., `ethereum`, `polygon`, `arbitrum`)
- All schemas have identical table structures
- This allows isolation and independent scaling per chain

### Logs Table Schema
Stores user positions detected from blockchain events.

```sql
CREATE TABLE logs (
  address TEXT NOT NULL,              -- User address (checksummed)
  contract_address TEXT NOT NULL,     -- Protocol contract address
  metadata_key TEXT,                  -- Metadata key (e.g., "tokenId", "pubkey")
  metadata_value TEXT,                -- Metadata value (e.g., "123", "0xabc...")
  CONSTRAINT logs_unique_all_columns 
    UNIQUE (address, contract_address, metadata_key, metadata_value)
);

-- Primary index on user address for fast lookups
CREATE INDEX idx_logs_address ON logs(address);
```

**Key Design Decisions**:
- No separate primary key; uniqueness enforced on all columns
- Metadata stored as separate rows (not JSON) for better query performance
- Each metadata key-value pair gets its own row
- Rows without metadata have `NULL` for `metadata_key` and `metadata_value`

**Example Data**:
```
address                                    | contract_address                           | metadata_key | metadata_value
-------------------------------------------|--------------------------------------------|--------------|-----------------
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb | 0x00000000219ab540356cBB839Cbe05303d7705Fa | pubkey       | 0xabc123...
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb | 0x00000000219ab540356cBB839Cbe05303d7705Fa | pubkey       | 0xdef456...
0x1234567890123456789012345678901234567890 | 0x1F98431c8aD98523631AE4a59f267346ea31F984 | tokenId      | 123
0x1234567890123456789012345678901234567890 | 0x1F98431c8aD98523631AE4a59f267346ea31F984 | tokenId      | 456
0xABCDEF0123456789012345678901234567890123 | 0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc | NULL         | NULL
```

### Jobs Table Schema
Tracks which contracts and events to monitor.

```sql
CREATE TABLE jobs (
  contract_address TEXT NOT NULL,
  topic_0 TEXT NOT NULL,
  user_address_index INTEGER NOT NULL CHECK (user_address_index IN (1, 2, 3)),
  block_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  event_abi TEXT,                               -- Full event ABI if using eventAbi format
  additional_metadata_arguments JSONB,          -- AdditionalMetadataConfig JSON
  transform_user_address_type TEXT,             -- Transformation type (e.g., "eth2-withdrawal-credentials")
  PRIMARY KEY (contract_address, topic_0, user_address_index)
);
```

**Column Descriptions**:
- `contract_address`: The protocol contract to monitor
- `topic_0`: keccak256 hash of the event signature (e.g., `0xddf252ad...` for Transfer)
- `user_address_index`: Which parameter contains the user address (1-3 for indexed params, or data index if using ABI)
- `block_number`: Block where this job was added (used as starting point for historic sync)
- `status`: 
  - `pending`: Historic sync not yet complete
  - `completed`: All historic blocks processed
  - `failed`: Error during processing
- `event_abi`: Full event signature if using the eventAbi format (e.g., `"event Transfer(address,address,uint256)"`)
- `additional_metadata_arguments`: JSON object with `argumentName` and `transformMetadataType` fields
- `transform_user_address_type`: Name of transformation function to apply to user address

**Example Data**:
```
contract_address                           | topic_0                                                            | user_address_index | block_number | status    | event_abi                          | additional_metadata_arguments          | transform_user_address_type
-------------------------------------------|--------------------------------------------------------------------|--------------------|--------------|-----------|------------------------------------|----------------------------------------|----------------------------
0x00000000219ab540356cBB839Cbe05303d7705Fa | 0x649bbc62d0e31342afea4e5cd82d4049e7e1ee912fc0889aa790803be39038c5 | 1                  | 11052984     | completed | event DepositEvent(bytes,bytes...) | {"argumentName":"pubkey"}              | eth2-withdrawal-credentials
0x1F98431c8aD98523631AE4a59f267346ea31F984 | 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef | 2                  | 12369621     | completed | event Transfer(address,address...) | {"argumentName":"tokenId"}             | NULL
0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc | 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef | 2                  | 10008355     | completed | NULL                               | NULL                                   | NULL
```

### Settings Table Schema
Stores chain-specific configuration and state.

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Initial seed data
INSERT INTO settings (key, value)
VALUES ('latest_block_processed', NULL)
ON CONFLICT DO NOTHING;
```

**Purpose**: Tracks the latest block number processed by the latest cache worker for this chain.

### Migrations Table
Automatically managed by the migration system. Tracks which migrations have been applied to each schema.

```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);
```

## Indexing Process

### 1. Initialization
```typescript
// Fetch all supported protocols for a chain
const support = await fetch('/support?filterChainIds=[1]')

// Build event mappings
const jobs = buildTokenEventMappings(support, chainId)

// Store in jobs table
await database.insertJobs(jobs)
```

### 2. Block Processing
For each new block:

```typescript
// Fetch logs matching our topics
const logs = await provider.getLogs({
  fromBlock: blockNumber,
  toBlock: blockNumber,
  topics: [
    [...allTopic0Hashes], // All event signatures we're tracking
    null, null, null      // We'll decode the rest
  ]
})

// Process each log
const processedLogs = []

for (const log of logs) {
  const job = findMatchingJob(log.address, log.topics[0])
  
  if (job.eventAbi) {
    // Decode full event data
    const iface = new Interface([job.eventAbi])
    const decoded = iface.parseLog(log)
    
    // Extract user address from the specified parameter
    const rawUserAddress = decoded.args[job.userAddressIndex]
    
    // Apply transformation if configured
    const userAddress = job.transformUserAddressType
      ? applyTransformation(rawUserAddress, job.transformUserAddressType)
      : getAddress(rawUserAddress)
    
    // Skip if transformation returned null (e.g., invalid withdrawal credentials)
    if (!userAddress) continue
    
    // Extract metadata if configured
    const metadata = {}
    if (job.additionalMetadataArguments) {
      const argIndex = iface.fragments[0].inputs.findIndex(
        input => input.name === job.additionalMetadataArguments.argumentName
      )
      if (argIndex !== -1) {
        metadata[job.additionalMetadataArguments.argumentName] = 
          decoded.args[argIndex]
      }
    }
    
    processedLogs.push({
      address: userAddress,
      contractAddress: log.address,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined
    })
  } else {
    // Extract from indexed topics only (faster path)
    const userAddress = getAddress('0x' + log.topics[job.userAddressIndex].slice(26))
    
    processedLogs.push({
      address: userAddress,
      contractAddress: log.address,
      metadata: undefined
    })
  }
}

// Batch insert all logs from this block
await database.insertLogs(processedLogs, blockNumber)
```

**Key Implementation Details**:
1. **Batch Processing**: All logs from a block are inserted in a single transaction
2. **Metadata Storage**: Each key-value pair in metadata object creates a separate row
3. **Null Handling**: Logs without metadata have `NULL` for both `metadata_key` and `metadata_value`
4. **Deduplication**: `ON CONFLICT DO NOTHING` prevents duplicate entries
5. **Transaction Safety**: All inserts wrapped in `BEGIN/COMMIT` with `ROLLBACK` on error

### 3. API Query Flow
When API receives request for user positions:

```typescript
// 1. Query database for user's protocols and metadata
const result = await database.query(
  `SELECT contract_address as "contractAddress", 
          metadata_key, 
          metadata_value
   FROM logs
   WHERE address = $1`,
  [userAddress]
)

// 2. Process results to group by contract
const contractAddresses = new Set()
const positionMetadataByContractAddress = {}

for (const row of result.rows) {
  contractAddresses.add(row.contractAddress)
  
  // Build metadata arrays per contract
  if (row.metadata_key && row.metadata_value) {
    if (!positionMetadataByContractAddress[row.contractAddress]) {
      positionMetadataByContractAddress[row.contractAddress] = []
    }
    positionMetadataByContractAddress[row.contractAddress].push(
      row.metadata_value
    )
  }
}

// Example result:
// {
//   contractAddresses: ["0xAAA", "0xBBB", "0xCCC"],
//   positionMetadataByContractAddress: {
//     "0xAAA": ["0xpubkey1", "0xpubkey2"],  // ETH2 validator pubkeys
//     "0xBBB": ["123", "456", "789"]        // Uniswap V4 token IDs
//     // "0xCCC" has no metadata (no entry in map)
//   }
// }

// 3. Filter adapters to only relevant protocols
const relevantAdapters = adapters.filter(adapter =>
  contractAddresses.has(adapter.contractAddress)
)

// 4. Call each adapter with its specific metadata
for (const adapter of relevantAdapters) {
  const metadata = positionMetadataByContractAddress[adapter.contractAddress]
  
  const positions = await adapter.getPositions({
    userAddress,
    protocolTokenAddresses: [adapter.contractAddress],
    tokenIds: metadata || undefined  // Pass metadata as tokenIds, or undefined to trigger getTokenIds()
  })
}
```

**Performance Benefits**:
1. **Single Query**: One database query fetches all user positions across all protocols
2. **Index Usage**: Query uses index on `address` column for fast lookup
3. **Filtered Adapters**: Only adapters with detected positions are called
4. **Metadata Passthrough**: Extracted metadata is passed directly to adapters, avoiding additional on-chain calls

**API Response Time Impact**:
- Without indexer: Check 100+ protocols × multiple contracts = slow
- With indexer: Query database → Call only 2-5 relevant adapters = fast

## User Address Transformations

### Available Transformers
Currently supported via `LOG_ARGUMENT_TRANSFORMERS`:

#### `eth2-withdrawal-credentials`
Converts Ethereum 2.0 withdrawal credentials (32 bytes) to an Ethereum address:
- Checks first byte is 0x01 (BLS withdrawal credentials with execution address)
- Extracts last 20 bytes as the address
- Returns null if not a valid withdrawal credential format

**Example**:
```typescript
// Input: 0x010000000000000000000000abcd1234abcd1234abcd1234abcd1234abcd1234
// Output: 0xabcd1234abcd1234abcd1234abcd1234abcd1234
```

### Adding New Transformers
To support new transformation types, add to `LOG_ARGUMENT_TRANSFORMERS` mapping in `packages/adapters-library/src/core/utils/log-argument-transformers.ts`.

## Real-World Examples

### Example 1: Uniswap V2 (Simple Transfer)
```typescript
{
  contractAddresses: ["0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"],
  userEvent: 'Transfer'
}
```
**Indexer Action**: Monitor standard Transfer events, extract `to` address from topic[2]

### Example 2: Compound V2 Borrow
```typescript
{
  contractAddresses: ["0x..."],
  userEvent: {
    eventAbi: 'event Borrow(address borrower, uint borrowAmount, uint accountBorrows, uint totalBorrows)',
    userAddressArgument: 'borrower'
  }
}
```
**Indexer Action**: Decode event data, extract `borrower` from decoded parameters

### Example 3: Ethereum 2.0 Staking
```typescript
{
  contractAddresses: ["0x00000000219ab540356cBB839Cbe05303d7705Fa"],
  userEvent: {
    eventAbi: 'event DepositEvent(bytes pubkey, bytes withdrawal_credentials, bytes amount, bytes signature, bytes index)',
    userAddressArgument: 'withdrawal_credentials',
    transformUserAddressType: 'eth2-withdrawal-credentials',
    additionalMetadataArguments: {
      argumentName: 'pubkey',
      transformMetadataType: undefined
    }
  }
}
```
**Indexer Action**: 
1. Decode event data
2. Extract `withdrawal_credentials`, transform to address
3. Extract `pubkey` as metadata
4. Store: (address, contract, { pubkey: "0x..." })

### Example 4: Uniswap V4 NFT Positions
```typescript
{
  contractAddresses: ["0x..."],
  userEvent: {
    eventAbi: 'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
    userAddressArgument: 'to',
    additionalMetadataArguments: {
      argumentName: 'tokenId',
      transformMetadataType: undefined
    }
  }
}
```
**Indexer Action**:
1. Extract `to` from topic[2]
2. Extract `tokenId` from topic[3]
3. Store: (address, contract, { tokenId: "123" })

## Testing & Validation

### Validation Checklist
- [ ] Can fetch `/support` endpoint and parse response
- [ ] Can convert `eventAbi` to `topic0` hash using `keccak256`
- [ ] Can extract user addresses from indexed topics (topic[1], topic[2], topic[3])
- [ ] Can decode event data for non-indexed parameters
- [ ] Can apply address transformations (e.g., eth2-withdrawal-credentials)
- [ ] Can extract and store additional metadata
- [ ] Database correctly indexes by user_address for fast lookups
- [ ] Can handle protocols with `userEvent: false` (skip indexing)
- [ ] Proper transaction handling with rollback on errors
- [ ] Deduplication works correctly (no duplicate entries)
- [ ] Metadata stored as separate rows, not JSON
- [ ] Historic cache completes successfully
- [ ] Latest cache keeps up with new blocks

### Test Cases

#### 1. Simple Transfer Event
**Protocol**: Uniswap V2 LP Token  
**Contract**: `0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc` (USDC-WETH)  
**Event**: `Transfer(address indexed from, address indexed to, uint256 value)`  
**Expected**:
- Extract `to` address from topic[2]
- No metadata extraction
- Insert: `(to_address, contract_address, NULL, NULL)`

**Test Query**:
```sql
SELECT * FROM logs 
WHERE contract_address = '0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc'
LIMIT 10;
```

#### 2. Custom Event with Topic0
**Protocol**: Metamask Pooled Staking  
**Event**: Custom staking event with topic0 hash  
**Expected**:
- Extract user address from specified topic index
- No metadata extraction
- Handle topic0 hash correctly

#### 3. Event with Transformation
**Protocol**: Ethereum 2.0 Staking  
**Contract**: `0x00000000219ab540356cBB839Cbe05303d7705Fa`  
**Event**: `DepositEvent(bytes pubkey, bytes withdrawal_credentials, ...)`  
**Expected**:
- Decode event data using ABI
- Extract `withdrawal_credentials` parameter
- Transform bytes32 to address (extract last 20 bytes)
- Extract `pubkey` as metadata
- Insert: `(transformed_address, contract_address, 'pubkey', '0x...')`

**Test Query**:
```sql
SELECT 
  address,
  metadata_key,
  metadata_value
FROM logs 
WHERE contract_address = '0x00000000219ab540356cBB839Cbe05303d7705Fa'
  AND metadata_key = 'pubkey'
LIMIT 5;
```

**Validation**:
- Verify address starts with `0x01` in withdrawal_credentials before transformation
- Verify pubkey is 96 characters (48 bytes)

#### 4. NFT Position with Metadata
**Protocol**: Uniswap V4  
**Contract**: NFT Position Manager  
**Event**: `Transfer(address indexed from, address indexed to, uint256 indexed tokenId)`  
**Expected**:
- Extract `to` address from topic[2]
- Extract `tokenId` from topic[3]
- Insert: `(to_address, contract_address, 'tokenId', '123')`

**Test Query**:
```sql
SELECT 
  address,
  metadata_value as token_id
FROM logs 
WHERE contract_address = '<nft_manager_address>'
  AND metadata_key = 'tokenId'
  AND address = '0x...'
ORDER BY CAST(metadata_value AS INTEGER);
```

#### 5. Multiple Metadata per User
**Scenario**: User has multiple validators  
**Expected**:
```sql
SELECT * FROM logs 
WHERE address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
  AND contract_address = '0x00000000219ab540356cBB839Cbe05303d7705Fa';

-- Should return multiple rows:
-- address    | contract_address | metadata_key | metadata_value
-- 0x742d35.. | 0x000000002...   | pubkey       | 0xabc123...
-- 0x742d35.. | 0x000000002...   | pubkey       | 0xdef456...
-- 0x742d35.. | 0x000000002...   | pubkey       | 0x789abc...
```

#### 6. API Integration Test
**Test Flow**:
1. Insert test data into logs table
2. Query `/user-pools/0x...`
3. Verify response contains correct contracts and metadata
4. Query `/positions/0x...`
5. Verify only relevant adapters are called
6. Verify positions are returned correctly

### Performance Testing

#### Block Processing Benchmark
```typescript
// Test processing speed
const startTime = Date.now()
await processBlock({
  blockNumber: 18500000,
  provider,
  userIndexMap,
  logger
})
const duration = Date.now() - startTime
console.log(`Processed block in ${duration}ms`)

// Target: <500ms per block
```

#### Database Query Benchmark
```sql
-- Test user lookup speed
EXPLAIN ANALYZE
SELECT contract_address, metadata_key, metadata_value
FROM logs
WHERE address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

-- Should use index scan, <10ms execution time
```

#### Batch Insert Benchmark
```typescript
// Test batch insert performance
const logs = generateTestLogs(1000)
const startTime = Date.now()
await cacheClient.insertLogs(logs)
const duration = Date.now() - startTime
console.log(`Inserted 1000 logs in ${duration}ms`)

// Target: <100ms for 1000 logs
```

### Monitoring Queries

#### Check Sync Status
```sql
-- See how far behind we are
SELECT 
  key,
  value as latest_block_processed
FROM settings
WHERE key = 'latest_block_processed';
```

#### Check Job Status
```sql
-- See which protocols are still syncing
SELECT 
  contract_address,
  topic_0,
  block_number as start_block,
  status
FROM jobs
WHERE status != 'completed'
ORDER BY block_number;
```

#### Monitor Growth Rate
```sql
-- Check how fast the database is growing
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_logs
FROM logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Note: Requires adding created_at timestamp column
```

## Troubleshooting Guide

### Common Issues

#### Issue: Worker stops processing blocks
**Symptoms**: `latest_block_processed` not updating  
**Diagnosis**:
```sql
SELECT value FROM settings WHERE key = 'latest_block_processed';
```
**Possible Causes**:
- RPC endpoint down or rate limited
- Database connection pool exhausted
- Uncaught exception in event parsing
- Worker thread crashed

**Solutions**:
1. Check RPC endpoint: `curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' <RPC_URL>`
2. Check database connections: `SELECT count(*) FROM pg_stat_activity WHERE datname = 'defi_adapters';`
3. Review worker logs for exceptions
4. Restart worker process
5. Check health endpoint: `curl http://localhost:3000/health`

#### Issue: Historic sync not completing
**Symptoms**: Jobs stuck in `pending` status  
**Diagnosis**:
```sql
SELECT 
  contract_address,
  block_number,
  status
FROM jobs
WHERE status = 'pending'
ORDER BY block_number;
```
**Possible Causes**:
- RPC rate limiting
- Large block range (too many events)
- Invalid event ABI
- Contract address incorrect

**Solutions**:
1. Reduce block range in historic cache config
2. Verify contract address: Check on Etherscan
3. Verify event ABI: `npm run build-types` or check ABI file
4. Manually mark as failed: `UPDATE jobs SET status = 'failed' WHERE ...`
5. Check for errors in `failed` jobs

#### Issue: Missing user positions
**Symptoms**: API returns no positions for user with known positions  
**Diagnosis**:
```sql
-- Check if user is in logs table
SELECT * FROM logs WHERE address = '0x...';

-- Check if contract is being tracked
SELECT * FROM jobs WHERE contract_address = '0x...';
```
**Possible Causes**:
- Event not tracked (userEvent: false)
- Address transformation failed
- Historic sync not complete
- Wrong contract address

**Solutions**:
1. Verify adapter has `userEvent` configured
2. Check job status: Should be `completed`
3. Manually check blockchain: Search for Transfer events to user address
4. Verify event signature matches: Calculate topic0 and compare

#### Issue: Duplicate entries in logs table
**Symptoms**: Same position appearing multiple times  
**Diagnosis**:
```sql
SELECT 
  address,
  contract_address,
  metadata_key,
  metadata_value,
  COUNT(*)
FROM logs
GROUP BY address, contract_address, metadata_key, metadata_value
HAVING COUNT(*) > 1;
```
**Possible Causes**:
- Unique constraint not properly created
- Migration failed

**Solutions**:
1. Verify constraint exists:
```sql
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'logs'::regclass;
```
2. Re-run migration 0003
3. Remove duplicates:
```sql
DELETE FROM logs a USING logs b
WHERE a.ctid < b.ctid
  AND a.address = b.address
  AND a.contract_address = b.contract_address
  AND a.metadata_key = b.metadata_key
  AND a.metadata_value = b.metadata_value;
```

#### Issue: Slow API queries
**Symptoms**: `/positions` endpoint taking >5 seconds  
**Diagnosis**:
```sql
EXPLAIN ANALYZE
SELECT contract_address, metadata_key, metadata_value
FROM logs
WHERE address = '0x...';
```
**Possible Causes**:
- Missing index on address column
- Table not vacuumed
- Too many positions for user

**Solutions**:
1. Verify index exists: `\d logs` in psql
2. Vacuum table: `VACUUM ANALYZE logs;`
3. Rebuild index: `REINDEX TABLE logs;`
4. Add pagination to API
5. Consider partitioning logs table by address range

#### Issue: Event transformation failing
**Symptoms**: Jobs stuck in `failed` status, no logs for protocol  
**Diagnosis**:
```sql
SELECT 
  contract_address,
  transform_user_address_type
FROM jobs
WHERE status = 'failed';
```
**Possible Causes**:
- Invalid transformation type
- Event data format unexpected
- Transformer logic bug

**Solutions**:
1. Check transformer exists in `LOG_ARGUMENT_TRANSFORMERS`
2. Manually decode an event and test transformation
3. Add error logging in `parseUserEventLog` function
4. Review transformer implementation

### Debug Commands

#### Enable verbose logging
```typescript
// In worker configuration
logger.level = 'debug'
```

#### Manually process a block
```bash
# In Node.js REPL
npm run build
node --experimental-strip-types
> const { processBlock } = require('./packages/workers/dist/cache/process-block.js')
> await processBlock({ blockNumber: 18500000, ... })
```

#### Test event parsing
```typescript
// Test ABI parsing
import { Interface } from 'ethers'
const abi = 'event DepositEvent(bytes pubkey, bytes withdrawal_credentials, ...)'
const iface = new Interface([abi])
console.log('Topic0:', iface.getEvent('DepositEvent').topicHash)

// Test log parsing
const decoded = iface.parseLog({ topics: [...], data: '0x...' })
console.log('Decoded:', decoded)
```

#### Reset a job
```sql
-- Reset job to re-sync from specific block
UPDATE jobs
SET status = 'pending',
    block_number = 18000000
WHERE contract_address = '0x...'
  AND topic_0 = '0x...';
```

## Worker Architecture

### Process Structure
The reference implementation uses a **main process + worker threads** architecture:

```
Main Process (API)
├── Health Check Endpoint (/health)
├── Metrics Endpoint (/metrics)
└── Worker Threads
    ├── Ethereum Worker
    │   ├── Latest Cache (follows chain tip)
    │   └── Historic Cache (backfills old blocks)
    ├── Polygon Worker
    │   ├── Latest Cache
    │   └── Historic Cache
    └── [... one worker per chain]
```

### Worker Thread Responsibilities

#### Latest Cache Process
- **Purpose**: Keep database up-to-date with new blocks
- **Operation**: Infinite loop that processes each new block as it's created
- **Flow**:
  1. Wait for new block
  2. Fetch all logs matching tracked events
  3. Parse logs and extract user addresses + metadata
  4. Insert into `logs` table
  5. Update `latest_block_processed` in `settings` table
  6. Send heartbeat to main process
  7. Repeat

#### Historic Cache Process
- **Purpose**: Backfill historical data for newly added protocols
- **Operation**: Processes old blocks for jobs in `pending` status
- **Flow**:
  1. Query `jobs` table for `status = 'pending'` or `status = 'failed'`
  2. For each job, fetch logs from `block_number` to current block
  3. Process logs in batches (e.g., 1000 blocks at a time)
  4. Insert into `logs` table
  5. Update job `status = 'completed'`
  6. Repeat

### Initialization Sequence
When a worker thread starts:

```typescript
1. Create database connection pool with schema for this chain
2. Run database migrations (if needed)
3. Fetch latest processed block from settings table
4. Fetch supported protocols from DefiProvider
5. Update jobs table with new protocols (if any)
6. Start Latest Cache process (follows chain tip)
7. Start Historic Cache process (backfills old data)
```

### Health Monitoring
- Each worker sends heartbeat to main process after processing each block
- Main process fails health check if no heartbeat received within 10 minutes
- Health check endpoint: `GET /health`

### Metrics
Prometheus metrics exposed at `GET /metrics`:
- Blocks processed per chain
- Processing latency per chain
- Database query times
- Log insertion rates
- Job completion status

## Performance Considerations

### Optimization Strategies

#### 1. Batch Processing
```typescript
// Process logs in batches of 1000
const batchSize = 1000
for (let i = 0; i < logs.length; i += batchSize) {
  const batch = logs.slice(i, i + batchSize)
  await database.insertLogs(batch)
}
```

#### 2. Transaction Management
- All inserts for a block wrapped in a single transaction
- `BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED`
- Automatic rollback on error
- Prevents partial block processing

#### 3. Database Indexing
```sql
-- Primary index for user lookups (most common query)
CREATE INDEX idx_logs_address ON logs(address);

-- Optional: Index for contract lookups
CREATE INDEX idx_logs_contract ON logs(contract_address);

-- Optional: Composite index for metadata queries
CREATE INDEX idx_logs_metadata ON logs(address, contract_address, metadata_key);
```

#### 4. Deduplication Strategy
```sql
-- Use ON CONFLICT to handle duplicate events gracefully
INSERT INTO logs (address, contract_address, metadata_key, metadata_value)
VALUES ($1, $2, $3, $4)
ON CONFLICT (address, contract_address, metadata_key, metadata_value) 
DO NOTHING;
```

#### 5. Connection Pooling
```typescript
// One connection pool per chain
const dbPools = {
  [Chain.Ethereum]: new Pool({ max: 10 }),
  [Chain.Polygon]: new Pool({ max: 10 }),
  // ...
}

// Use mutex for concurrent writes
const logsMutex = new Mutex()
await logsMutex.acquire()
try {
  await insertLogs(...)
} finally {
  logsMutex.release()
}
```

#### 6. RPC Request Optimization
```typescript
// Batch multiple blocks in historic sync
const blockRange = 1000
for (let from = startBlock; from < endBlock; from += blockRange) {
  const to = Math.min(from + blockRange, endBlock)
  const logs = await provider.getLogs({ fromBlock: from, toBlock: to })
  await processLogs(logs)
}

// Use multiple RPC endpoints for redundancy
const providers = [
  new JsonRpcProvider(rpcUrl1),
  new JsonRpcProvider(rpcUrl2),
]
```

### Scaling Considerations

#### Vertical Scaling (Current Approach)
- One worker thread per chain in a single process
- Each chain has its own database schema
- Each worker has its own connection pool
- **Limit**: Database connection limits (typically ~100-200 connections)

#### Horizontal Scaling (Future)
If single process becomes insufficient:
```
Pod 1: Ethereum, Polygon, BSC workers
Pod 2: Arbitrum, Optimism, Base workers
Pod 3: Avalanche, Fantom, Linea workers
```

#### Database Scaling
- **Current**: Single PostgreSQL instance, schema-per-chain
- **Future Option 1**: Separate databases per chain
- **Future Option 2**: Read replicas for API queries
- **Future Option 3**: Shard by address range

### Performance Metrics (Reference)
Based on Ethereum mainnet:
- **Block processing time**: 100-500ms per block
- **Historic sync**: ~10,000 blocks/minute
- **Database size**: ~1GB per 10M log entries
- **Query performance**: <10ms for user address lookup

### Resource Requirements
**Minimum per chain**:
- CPU: 0.5 cores
- Memory: 512MB
- Database connections: 5-10
- RPC rate limit: ~100 requests/minute

**Recommended for production**:
- CPU: 1-2 cores per chain
- Memory: 1-2GB per chain
- Database connections: 10-20 per chain
- RPC rate limit: 500+ requests/minute
- Redundant RPC endpoints

## Current Reference Implementation

The existing Node.js worker implementation can be found in:
- `packages/workers/src/update-new-jobs.ts` - Builds job mappings from support data
- `packages/workers/src/cache/parse-user-event-log.ts` - Parses events and extracts data
- `packages/workers/src/cache/process-block.ts` - Processes blocks and stores logs
- `packages/workers/src/database/postgres-cache-client.ts` - Database operations
- `packages/workers/src/database/migrations/` - Database schema migrations
- `packages/workers/README.md` - Architecture documentation

### Key Files Overview

#### `buildTokenEventMappings` Function
Converts adapter settings into job configurations:
```typescript
// Input: Protocol support data from DefiProvider
// Output: Array of job configurations
[
  {
    contractAddress: "0x00000000219ab540356cBB839Cbe05303d7705Fa",
    topic0: "0x649bbc62d0e31342afea4e5cd82d4049e7e1ee912fc0889aa790803be39038c5",
    userAddressIndex: 1,
    eventAbi: "event DepositEvent(bytes pubkey, bytes withdrawal_credentials, ...)",
    additionalMetadataArguments: { argumentName: "pubkey" },
    transformUserAddressType: "eth2-withdrawal-credentials"
  }
]
```

#### `parseUserEventLog` Function
Parses individual event logs:
```typescript
// Decodes event using ethers.js Interface
// Extracts user address with optional transformation
// Extracts metadata if configured
// Returns: { userAddress, metadata: { key: value } }
```

#### `CacheClient` Interface
Database operations abstraction:
```typescript
interface CacheClient {
  getLatestBlockProcessed(): Promise<number | undefined>
  updateLatestBlockProcessed(blockNumber: number): Promise<void>
  fetchAllJobs(): Promise<JobDbEntry[]>
  insertJobs(entries: JobEntry[], blockNumber: number): Promise<number>
  updateJobStatus(addresses: string[], topic0: string, ...): Promise<void>
  insertLogs(logs: LogEntry[], blockNumber?: number): Promise<number>
}
```

## SQL Query Examples

### Queries for Worker Implementation

#### Initialize Jobs for a Protocol
```sql
-- Insert new job for monitoring
INSERT INTO jobs (
  contract_address, 
  topic_0, 
  event_abi,
  user_address_index, 
  block_number,
  additional_metadata_arguments,
  transform_user_address_type,
  status
)
VALUES (
  '0x00000000219ab540356cBB839Cbe05303d7705Fa',
  '0x649bbc62d0e31342afea4e5cd82d4049e7e1ee912fc0889aa790803be39038c5',
  'event DepositEvent(bytes pubkey, bytes withdrawal_credentials, bytes amount, bytes signature, bytes index)',
  1,
  11052984,
  '{"argumentName":"pubkey"}',
  'eth2-withdrawal-credentials',
  'pending'
)
ON CONFLICT (contract_address, topic_0, user_address_index) 
DO NOTHING;
```

#### Fetch Pending Jobs
```sql
-- Get all jobs that need historic backfill
SELECT 
  contract_address as "contractAddress",
  topic_0 as "topic0",
  event_abi as "eventAbi",
  user_address_index as "userAddressIndex",
  block_number as "blockNumber",
  additional_metadata_arguments as "additionalMetadataArguments",
  transform_user_address_type as "transformUserAddressType"
FROM jobs
WHERE status IN ('pending', 'failed');
```

#### Insert User Positions (Batch)
```sql
-- Insert multiple log entries in one query
INSERT INTO logs (
  address, 
  contract_address, 
  metadata_key, 
  metadata_value
)
VALUES 
  ('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', '0x00000000219ab540356cBB839Cbe05303d7705Fa', 'pubkey', '0xabc123...'),
  ('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', '0x00000000219ab540356cBB839Cbe05303d7705Fa', 'pubkey', '0xdef456...'),
  ('0x1234567890123456789012345678901234567890', '0x1F98431c8aD98523631AE4a59f267346ea31F984', 'tokenId', '123')
ON CONFLICT (address, contract_address, metadata_key, metadata_value) 
DO NOTHING;
```

#### Update Latest Block Processed
```sql
-- Track progress
UPDATE settings 
SET value = '18500000' 
WHERE key = 'latest_block_processed';
```

#### Mark Job as Completed
```sql
-- After historic sync completes
UPDATE jobs
SET status = 'completed'
WHERE contract_address = '0x00000000219ab540356cBB839Cbe05303d7705Fa'
  AND topic_0 = '0x649bbc62d0e31342afea4e5cd82d4049e7e1ee912fc0889aa790803be39038c5'
  AND user_address_index = 1;
```

### Queries for API Implementation

#### Get User Positions (Simple)
```sql
-- Get all contracts user has interacted with
SELECT DISTINCT contract_address
FROM logs
WHERE address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
```

#### Get User Positions with Metadata
```sql
-- Get contracts and metadata
SELECT 
  contract_address as "contractAddress",
  metadata_key,
  metadata_value
FROM logs
WHERE address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

-- Example result:
-- contractAddress                           | metadata_key | metadata_value
-- ------------------------------------------|--------------|----------------
-- 0x00000000219ab540356cBB839Cbe05303d7705Fa | pubkey       | 0xabc123...
-- 0x00000000219ab540356cBB839Cbe05303d7705Fa | pubkey       | 0xdef456...
-- 0x1F98431c8aD98523631AE4a59f267346ea31F984 | tokenId      | 123
```

#### Get Metadata for Specific Contract
```sql
-- Get all token IDs for a specific protocol
SELECT metadata_value
FROM logs
WHERE address = '0x1234567890123456789012345678901234567890'
  AND contract_address = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
  AND metadata_key = 'tokenId';
```

### Analytics Queries

#### Count Users per Protocol
```sql
SELECT 
  contract_address,
  COUNT(DISTINCT address) as user_count
FROM logs
GROUP BY contract_address
ORDER BY user_count DESC;
```

#### Count Total Positions
```sql
SELECT 
  COUNT(*) as total_logs,
  COUNT(DISTINCT address) as unique_users,
  COUNT(DISTINCT contract_address) as unique_contracts
FROM logs;
```

#### Find Most Active Users
```sql
SELECT 
  address,
  COUNT(DISTINCT contract_address) as protocol_count
FROM logs
GROUP BY address
ORDER BY protocol_count DESC
LIMIT 100;
```

#### Job Status Summary
```sql
SELECT 
  status,
  COUNT(*) as count
FROM jobs
GROUP BY status;
```

#### Database Size Monitoring
```sql
-- Get table sizes
SELECT 
  tablename as "tableName",
  pg_size_pretty(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))) as "totalSize",
  pg_size_pretty(pg_table_size(quote_ident(schemaname) || '.' || quote_ident(tablename))) as "tableSize",
  pg_size_pretty(pg_indexes_size(quote_ident(schemaname) || '.' || quote_ident(tablename))) as "indexSize"
FROM pg_tables
WHERE schemaname = 'ethereum'
ORDER BY pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename)) DESC;
```

## Support & Questions

For implementation questions:
1. Review the TypeScript type definitions in `packages/adapters-library/src/types/adapter.ts`
2. Check existing protocol examples in `packages/adapters-library/src/adapters/`
3. Reference the worker implementation in `packages/workers/src/`
4. Test against the API `/support` endpoint to see live configuration data

## Appendix: Complete Type Reference

```typescript
// From packages/adapters-library/src/types/adapter.ts

export type AdditionalMetadataConfig = {
  argumentName: string
  transformMetadataType: undefined
}

export type AdapterSettings = {
  includeInUnwrap: boolean
  version?: number
  userEvent:
    | {
        topic0: `0x${string}`
        userAddressIndex: 1 | 2 | 3
      }
    | {
        eventAbi: `event ${string}(${string})`
        userAddressArgument: string
        transformUserAddressType?: string
        additionalMetadataArguments?: AdditionalMetadataConfig
      }
    | 'Transfer'
    | false
}

// Support response structure
export type Support = Partial<
  Record<
    Protocol,
    Array<{
      protocolDetails: ProtocolDetails
      chains: Chain[]
      protocolTokenAddresses: string[]
      userEvent: AdapterSettings['userEvent']
    }>
  >
>
```

---

**Document Version**: 1.0  
**Last Updated**: December 18, 2025  
**Maintained By**: MMI DeFi Adapters Team

