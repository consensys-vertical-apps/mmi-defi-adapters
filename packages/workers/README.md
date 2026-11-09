# Package Description
This package serves as the entry point for a worker process that scans every supported chain for events that will be used to determine all the pools a specific EVM address has had a DeFi position with.

# Local development

Workers need PostgreSQL and RPC providers. Without a populated cache DB, the API/CLI cannot detect which pools a user has interacted with.

## 1. Environment

From the repo root, copy `.env.example` to `.env` (if you do not already have one) and set at least:

```bash
# Required for workers + positions cache consumers
CACHE_DATABASE_URL=postgresql://postgres:postgres@0.0.0.0:5432/defi-adapters
CACHE_DATABASE_DISABLE_SSL=true

# Required for adapters-api / CLI to read the cache
DEFI_ADAPTERS_USE_POSITIONS_CACHE=true
USE_ADAPTERS_WITH_USER_EVENT_ONLY=true

# Only index these chains (recommended for local). Without this, unset
# DEFI_ADAPTERS_PROVIDER_* vars fall back to built-in Infura defaults.
DEFI_ADAPTERS_ENABLED_CHAINS=ethereum

DEFI_ADAPTERS_PROVIDER_ETHEREUM=https://mainnet.infura.io/v3/<your-key>
```

Postgres credentials from `docker-compose.yaml` are user `postgres`, password `postgres`, database `defi-adapters`.

`npm run start:workers` / `npm run start:api` load the repo-root `.env` automatically (with override). Edit `.env`, restart the process — no shell `export` / `source` needed.

## 2. Start Postgres

From the repo root:

```bash
docker compose up postgres
```

## 3. Build and run workers (hybrid / recommended for coding)

```bash
nvm use 22
npm i
npm run build
npm run start:workers
```

The start script loads the repo-root `.env` automatically (with override), so you do **not** need to `export` / `source` env vars in your shell. Edit `.env`, restart the process, and the new values apply.

Workers listen on port `4000` by default (`/health`, `/metrics`).

On a fresh database, historic cache backfills every registered pool from block 0 — expect a long initial sync. Limit chains (above) to keep local runs manageable.

### Optional: API + UI alongside workers

```bash
npm run start:api   # API only (also loads root .env)
# or
npm run dev         # rebuild library + API + UI
```

Ensure `DEFI_ADAPTERS_USE_POSITIONS_CACHE=true` so the API reads from Postgres.

## 4. Full Docker stack (alternative)

Builds and runs Postgres, workers, and API together. Provider URLs are taken from the host `.env`:

```bash
docker compose up --build
```

- API: `3000`
- Workers: `4000`
- Postgres: `5432`

## 5. Verify

- Workers health: `http://localhost:4000/health` (block progress should advance for enabled chains)
- Query positions once some historic/latest indexing has run:

```bash
npm run positions <userAddress> -- -c ethereum
```

# Architecture Overview
<p align="center">
  <img src="./readme-assets/workers-architecture.png" width="1200">
</p>

The process consists of:
- A single main thread that runs an API
- One worker thread per chain.

## Main process
Runs a Hono API instance that exposes `/health` and `/metrics` endpoints.

The `/health` endpoint receives a message from every worker thread every time a new block is processed. If no message is received from any worker thread within 10 minutes, the health check fails.

The `/metrics` endpoint is the Prometheus text exposition from `prom-client` (Node defaults plus custom worker counters).

### Custom metrics

Indexing runs in worker threads; counters are updated on the main thread after `postMessage` metric events.

| Metric | Labels | Meaning |
| --- | --- | --- |
| `defi_workers_rpc_calls_total` | `chainId`, `method`, `phase` | RPC attempts (`eth_getLogs`, `eth_getBlockReceipts`, `eth_blockNumber`); `phase` is `historic` or `latest` |
| `defi_workers_wallets_seen_total` | `chainId`, `phase` | Unique wallet addresses in a log batch before insert |
| `defi_workers_wallets_inserted_total` | `chainId`, `phase` | Rows actually inserted by `insertLogs` (`rowCount`) |

## Worker thread

Every supported chain has a worker thread that, after initialization, creates two infinite loops that run the following services:
- Latest Cache: Scans every block on the chain as they are being created and extracts the necessary events, which are then added to the DB. After every block is processed, a message is sent to the main thread.
- Historic Cache: When a new pool is introduced, it extracts all the necessary events that occurred from block 0 to the current block.

### Initialization
Every time a worker thread starts, the following steps occur:
- A database connection pool is created for that chain
- The latest processed block for that chain is used to initialize the process
    * If it's a new chain, the latest block for that chain is used
- The list of pools is updated; any new pools are added to the database using the latest processed block as reference for the two cache processes.
- The two cache processes are initialized.

## Database

There is a single PostgreSQL database. Each chain has its own schema with its own set of tables. All tables are identical.

### Tables
- `jobs`: This table has an entry for each supported DeFi pool and it includes information about the event and arguments that are needed to extract in order to determine if an address has had a position in that pool. It also includes the block in which the pool was added to the table, as well as whether it has finished processing all the previous blocks.

- `logs`: This is a very basic two-column table that indicates if an Ethereum address has had a position with a supported pool. The first column, important for indexing purposes, is the Ethereum address, the second one is the pool address. This table is only queried by Ethereum address so that it returns the list of pools that the address has had positions with.

- `settings`: This is a set of persisted keys and values. For the time being, it only stores the latest block processed for that chain.

- `migrations`: This table stores all the migrations that have been applied.

### Migrations

To make changes to the database tables, create a new migration file:
`packages/workers/src/database/migrations/<XXXX>-<DESCRIPTION>.ts`

Where `<XXXX>` is a sequential 4-digit number indicating the order in which migrations are applied and `<DESCRIPTION>` is a kebab-case description of the migration.

Each migration file must have a default export with the following signature:
`function (client: Pool): Promise<void>`

# Exports
The package also exports a series of utilities that are used in other packages of the repository (CLI and API)
- `buildPostgresPoolFilter`: Used to create the filter that reads the database to speed up queries.
- `createDbPool`: Utility to initialize a set of pools per chain that use the correct schema.
- `buildTokenEventMappings`: Utility that returns an array with all the supported pools and the event information needed from them.
- `createWatchKey`: Utility that returns a unique key for each pool and event.
- `processReceipts`: Utility that parses and returns the needed information from an array of transaction receipts.

# Observations
- When enough new chains are added, it is possible that having each worker use its own set of pools will exceed the number of connections allowed. If that occurs, it might be best to split the chains into multiple databases, as they do not interact with each other.

- This process is meant to run in a single pod. If it becomes difficult to scale the pod, multiple pods could run by splitting the chains between them.