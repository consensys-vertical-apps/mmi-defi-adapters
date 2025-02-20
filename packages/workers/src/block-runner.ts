import { type Chain, ChainName } from '@metamask-institutional/defi-adapters'
import { AVERAGE_BLOCKS_PER_10_MINUTES } from '@metamask-institutional/defi-adapters/dist/core/constants/AVERAGE_BLOCKS_PER_10_MINS.js'
import { AVERAGE_BLOCKS_PER_DAY } from '@metamask-institutional/defi-adapters/dist/core/constants/AVERAGE_BLOCKS_PER_DAY.js'
import { logger } from './logger.js'
import type { JsonRpcProvider } from 'ethers'

export class BlockRunner {
  private _provider: JsonRpcProvider
  private _chainId: Chain
  private _chainName: string

  private static readonly _BATCH_SIZE = 50

  private _latestBlockNumber: number | undefined
  private _getStartBlockNumber: () => Promise<number>
  private _processBlockFn: (blockNumber: number) => Promise<void>
  private _onError: (latestSafeProcessedBlock: number) => Promise<void>

  constructor({
    provider,
    chainId,
    getStartBlockNumberFn,
    processBlockFn,
    onError,
  }: {
    provider: JsonRpcProvider
    chainId: Chain
    getStartBlockNumberFn: () => Promise<number>
    processBlockFn: (blockNumber: number) => Promise<void>
    onError: (latestSafeProcessedBlock: number) => Promise<void>
  }) {
    this._chainName = ChainName[chainId]
    this._processBlockFn = processBlockFn
    this._getStartBlockNumber = getStartBlockNumberFn
    this._onError = onError

    this._provider = provider
    this._chainId = chainId
  }

  private async waitForBlockToBeReady(currentBlock: number): Promise<true> {
    let backoff = 1000 // Start with 1 second

    // Initialize latest block number if not already set
    if (!this._latestBlockNumber) {
      this._latestBlockNumber = await this._provider.getBlockNumber()
    }

    // If the current block is already processable, return it
    if (currentBlock <= this._latestBlockNumber) {
      return true
    }

    while (currentBlock > this._latestBlockNumber) {
      try {
        const blockNumber = await this._provider.getBlockNumber()

        if (blockNumber > this._latestBlockNumber) {
          this._latestBlockNumber = blockNumber
          logger.info(`[${this._chainName}] New block detected: ${blockNumber}`)
          break // Exit loop when a new block is found
        }
      } catch (error) {
        logger.error(`[${this._chainName}] Error fetching block number:`, error)
      }

      // Wait with exponential backoff before retrying
      await new Promise((resolve) => setTimeout(resolve, backoff))
      backoff = Math.min(backoff * 2, 60000) // Cap at 1 minute
    }

    return true
  }

  async start(startBlockOverride?: number) {
    logger.info(`[${this._chainName}] Starting block indexer...`)

    const firstBlock = startBlockOverride ?? (await this._getStartBlockNumber())
    let processingBlockNumber = firstBlock

    // Initialize latest block number
    this._latestBlockNumber = await this._provider.getBlockNumber()

    while (true) {
      try {
        await this.waitForBlockToBeReady(processingBlockNumber)

        const shouldBatch = this.shouldBatch(
          processingBlockNumber,
          this._latestBlockNumber,
        )

        if (shouldBatch) {
          processingBlockNumber = await this.processBatchBlocks(
            processingBlockNumber,
            this._latestBlockNumber,
          )
        } else {
          await this.processSingleBlock(processingBlockNumber)
          processingBlockNumber++
        }

        await this.logUpdate(
          this._chainId,
          processingBlockNumber,
          this._provider,
        )
      } catch (error) {
        await this.handleProcessingError(error, processingBlockNumber)
      }
    }
  }

  /**
   * Determines whether blocks should be processed in batch mode.
   */
  private shouldBatch(
    processingBlockNumber: number,
    latestBlockNumber: number,
  ): boolean {
    return latestBlockNumber - processingBlockNumber > BlockRunner._BATCH_SIZE
  }

  /**
   * Processes a batch of blocks concurrently.
   */
  private async processBatchBlocks(
    startBlock: number,
    latestBlockNumber: number,
  ): Promise<number> {
    const batchEndBlock = Math.min(
      startBlock + BlockRunner._BATCH_SIZE,
      latestBlockNumber,
    )
    const blockPromises: Promise<void>[] = []

    for (let blockNum = startBlock; blockNum < batchEndBlock; blockNum++) {
      blockPromises.push(this.processSingleBlock(blockNum))
    }

    await Promise.all(blockPromises)
    return batchEndBlock
  }

  /**
   * Processes a single block.
   */
  private async processSingleBlock(blockNumber: number): Promise<void> {
    try {
      await this._processBlockFn(blockNumber)
      logger.info(`[${this._chainName}] Processed block ${blockNumber}`)
    } catch (error) {
      logger.error(
        error,
        `[${this._chainName}] Error processing block ${blockNumber}:`,
      )
      throw error
    }
  }

  /**
   * Handles processing errors, including retries.
   */
  private async handleProcessingError(
    error: unknown,
    processingBlockNumber: number,
  ): Promise<void> {
    logger.error(
      `[${this._chainName}] Error processing block ${processingBlockNumber}:`,
      error instanceof Error ? error.stack : String(error),
    )

    const earliestSafeBlock = processingBlockNumber - BlockRunner._BATCH_SIZE

    await this._onError(earliestSafeBlock)
    await new Promise((res) => setTimeout(res, 1000))
  }

  private async logUpdate(
    chain: Chain,
    processingBlockNumber: number,
    provider: JsonRpcProvider,
  ) {
    if (processingBlockNumber % AVERAGE_BLOCKS_PER_10_MINUTES[chain] === 0) {
      const currentHeadBlock = await provider.getBlockNumber()
      const blocksLagging = currentHeadBlock - processingBlockNumber
      const blocksPerHour = AVERAGE_BLOCKS_PER_DAY[chain] / 24
      const lagInHours = (blocksLagging / blocksPerHour).toFixed(1)

      logger.info(
        `[${this._chainName}] Indexer is ${lagInHours} hours behind, lagging ${blocksLagging} blocks.`,
      )
    }
  }
}
