import { Database as DatabaseType } from 'better-sqlite3'
import { AVERAGE_BLOCKS_PER_10_MINUTES } from '../core/constants/AVERAGE_BLOCKS_PER_10_MINS'
import { AVERAGE_BLOCKS_PER_DAY } from '../core/constants/AVERAGE_BLOCKS_PER_DAY'
import { Chain, ChainIdToChainNameMap } from '../core/constants/chains'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { createDatabase } from './createDatabase'

/**
 * BlockIndexer creates a SQLite database and continuously indexes blocks for a given blockchain.
 * It listens for new blocks, stores processed blocks, and executes queries to maintain an index.
 */
export class BlockIndexer {
  private _provider: CustomJsonRpcProvider
  private _chainId: Chain
  private _chainName: string
  public db: DatabaseType
  private static readonly _BATCH_SIZE = 50
  private static readonly _MAX_RETRIES = 5
  private _startBlockOverride: number | undefined
  private _latestBlockNumber: number | undefined

  constructor({
    provider,
    chainId,
    chainName,
    dbName,
    startBlockOverride,
    additionalTablesToCreate,
  }: {
    provider: CustomJsonRpcProvider
    chainId: Chain
    chainName: string
    dbName: string
    startBlockOverride?: number
    additionalTablesToCreate?: Record<string, string>
  }) {
    if (!dbName.endsWith('.db')) {
      throw new Error('Database path must end with .db')
    }

    this._startBlockOverride = startBlockOverride
    this._provider = provider
    this._chainId = chainId
    this._chainName = chainName

    this.db = createDatabase(dbName, {
      latest_block_processed: `
      CREATE TABLE IF NOT EXISTS latest_block_processed (
        id INTEGER PRIMARY KEY DEFAULT 1,
        latest_block_processed INTEGER NOT NULL
      );
    `,
      ...additionalTablesToCreate,
    })
  }

  public seedDb(seedDefaultData: string[]) {
    seedDefaultData?.forEach((query) => this.db.exec(query))
  }

  public async getIndexerBlockNumbers(): Promise<{
    startBlockOverride?: number
    lastProcessedBlockNumber: number
  }> {
    return {
      startBlockOverride: this._startBlockOverride,
      lastProcessedBlockNumber: await this.getLatestProcessedBlockNumber(),
    }
  }

  private async getLatestProcessedBlockNumber(): Promise<number> {
    const row = this.db
      .prepare('SELECT latest_block_processed FROM latest_block_processed')
      .get() as { latest_block_processed?: number } | undefined

    console.log(`Last processed block: ${row?.latest_block_processed}`)

    return row?.latest_block_processed ?? 0
  }

  private async waitForNewBlockToProcess(currentBlock: number): Promise<void> {
    let backoff = 1000 // Start with 1 second

    if (!this._latestBlockNumber) {
      this._latestBlockNumber = await this._provider.getBlockNumber()
    }

    while (currentBlock >= this._latestBlockNumber) {
      try {
        const blockNumber = await this._provider.getBlockNumber()
        console.log(`[${this._chainName}] Latest block number: ${blockNumber}`)
        if (blockNumber > this._latestBlockNumber) {
          this._latestBlockNumber = blockNumber
          return
        }
      } catch (error) {
        console.error(
          `[${this._chainName}] Error fetching block number:`,
          error,
        )
      }
      await new Promise((resolve) => setTimeout(resolve, backoff))
      backoff = Math.min(backoff * 2, 60000) // Exponential backoff up to max 1 minute
    }
  }

  /**
   * Processes blocks by fetching data and executing SQL queries.
   * @param processBlockFn Function that takes a block number and returns an array of SQL queries to execute.
   * @param startBlock Optional start block number. If not provided, it resumes from the last processed block.
   */
  async processBlocks(
    processBlockFn: (blockNumber: number) => Promise<string[]>,
  ) {
    console.log(`[${this._chainName}] Starting block indexer...`)
    let processingBlockNumber =
      this._startBlockOverride ?? (await this.getLatestProcessedBlockNumber())
    this._latestBlockNumber = await this._provider.getBlockNumber()
    let retryCount = 0

    while (retryCount <= BlockIndexer._MAX_RETRIES) {
      try {
        // ensures we dont query future blocks
        if (processingBlockNumber >= this._latestBlockNumber) {
          await this.waitForNewBlockToProcess(processingBlockNumber)
        }

        // if the indexer is too far behind, batch process blocks
        const shouldBatch =
          this._latestBlockNumber - processingBlockNumber >
          BlockIndexer._BATCH_SIZE

        const results: string[] = []

        if (shouldBatch) {
          const batchEndBlock = Math.min(
            processingBlockNumber + BlockIndexer._BATCH_SIZE,
            this._latestBlockNumber,
          )
          const blockPromises = []
          for (
            let blockNum = processingBlockNumber;
            blockNum < batchEndBlock;
            blockNum++
          ) {
            blockPromises.push(
              processBlockFn(blockNum).then((result) => {
                results.push(...result)
                console.log(`[${this._chainName}] Processed block ${blockNum}`)
              }),
            )
          }
          await Promise.all(blockPromises)
          processingBlockNumber = batchEndBlock
        } else {
          const result = await processBlockFn(processingBlockNumber)
          results.push(...result)
          console.log(
            `[${this._chainName}] Processed block ${processingBlockNumber}`,
          )
          processingBlockNumber++
        }

        this.db.transaction((inserts) => {
          inserts.forEach((insert: string) => this.db.prepare(insert).run())
          this.db
            .prepare(
              'INSERT OR REPLACE INTO latest_block_processed (id, latest_block_processed) VALUES (1, ?)',
            )
            .run(processingBlockNumber)
        })(results)

        await logUpdate(this._chainId, this._provider)
      } catch (error) {
        console.error(
          `[${this._chainName}] Error processing block ${processingBlockNumber}:`,
          error instanceof Error ? error.stack : String(error),
        )

        console.log(
          `curl -X POST --data '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x${processingBlockNumber.toString(
            16,
          )}", true],"id":1}' -H "Content-Type: application/json" ${
            this._provider._getConnection().url
          } | jq`,
        )

        retryCount++
        if (retryCount >= BlockIndexer._MAX_RETRIES) {
          const earliestSafeBlock =
            processingBlockNumber - BlockIndexer._BATCH_SIZE
          this.db
            .prepare(
              'INSERT OR REPLACE INTO latest_block_processed (id, latest_block_processed) VALUES (1, ?)',
            )
            .run(earliestSafeBlock)
          throw new Error(
            `[${this._chainName}] Max retries exceeded for block ${processingBlockNumber}`,
          )
        }
        await new Promise((res) => setTimeout(res, 5000 * retryCount))
      }
    }

    async function logUpdate(chain: Chain, provider: CustomJsonRpcProvider) {
      if (processingBlockNumber % AVERAGE_BLOCKS_PER_10_MINUTES[chain] === 0) {
        const currentHeadBlock = await provider.getBlockNumber()
        const blocksLagging = currentHeadBlock - processingBlockNumber
        const blocksPerHour = AVERAGE_BLOCKS_PER_DAY[chain] / 24
        const lagInHours = (blocksLagging / blocksPerHour).toFixed(1)

        console.log(
          `[${ChainIdToChainNameMap[chain]}] Indexer is ${lagInHours} hours behind, lagging ${blocksLagging} blocks.`,
        )
      }
    }
  }
}
