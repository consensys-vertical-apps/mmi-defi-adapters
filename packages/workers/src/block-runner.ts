import {
  AVERAGE_BLOCKS_PER_DAY,
  Chain,
} from '@metamask-institutional/defi-adapters'
import type { JsonRpcProvider } from 'ethers'
import type { Logger } from 'pino'
import { extractErrorMessage } from './utils/extractErrorMessage.js'
import { withTimeout } from './utils/with-timeout.js'

const SIXTY_SECONDS = 60_000

export class BlockRunner {
  private _provider: JsonRpcProvider
  private _chainId: Chain
  private _logger: Logger
  private _batchSize: number
  private _processBlockFn: (blockNumber: number) => Promise<void>
  private _onError: (latestSafeProcessedBlock: number) => Promise<void>

  private _processingBlockNumber: number
  private _latestBlockNumber: number | undefined

  constructor({
    processingBlockNumber,
    provider,
    chainId,
    processBlockFn,
    onError,
    logger,
  }: {
    processingBlockNumber: number
    provider: JsonRpcProvider
    chainId: Chain
    processBlockFn: (blockNumber: number) => Promise<void>
    onError: (latestSafeProcessedBlock: number) => Promise<void>
    logger: Logger
  }) {
    this._processingBlockNumber = processingBlockNumber

    this._processBlockFn = processBlockFn
    this._onError = onError

    this._provider = provider
    this._chainId = chainId
    this._logger = logger

    this._batchSize = Number(process.env.BLOCK_RUNNER_BATCH_SIZE || 10)
  }

  private async waitForBlockToBeReady(): Promise<true> {
    let backoff = 1000 // Start with 1 second

    // Initialize latest block number if not already set
    if (!this._latestBlockNumber) {
      this._latestBlockNumber = await withTimeout(
        this._provider.getBlockNumber(),
      )
    }

    // If the current block is already processable, return it
    if (this._processingBlockNumber <= this._latestBlockNumber) {
      return true
    }

    while (this._processingBlockNumber > this._latestBlockNumber) {
      try {
        const blockNumber = await withTimeout(this._provider.getBlockNumber())

        if (blockNumber > this._latestBlockNumber) {
          this._latestBlockNumber = blockNumber
          break // Exit loop when a new block is found
        }
      } catch (error) {
        this._logger.error(
          { error: extractErrorMessage(error) },
          'Error fetching block number',
        )
      }

      // Wait with exponential backoff before retrying
      await new Promise((resolve) => setTimeout(resolve, backoff))
      backoff = Math.min(backoff * 2, SIXTY_SECONDS)
    }

    return true
  }

  async start() {
    // Initialize latest block number
    this._latestBlockNumber = await withTimeout(this._provider.getBlockNumber())

    this.setLogInterval()

    while (true) {
      try {
        await this.waitForBlockToBeReady()

        const shouldBatch =
          this._latestBlockNumber - this._processingBlockNumber >
          this._batchSize

        if (shouldBatch) {
          this._processingBlockNumber = await this.processBatchBlocks(
            this._processingBlockNumber,
            this._latestBlockNumber,
          )
        } else {
          await this._processBlockFn(this._processingBlockNumber)
          this._processingBlockNumber++
        }
      } catch (error) {
        this._logger.error(
          {
            error,
            processingBlockNumber: this._processingBlockNumber,
            latestBlockNumber: this._latestBlockNumber,
          },
          'Error processing block',
        )
        await this.handleProcessingError(this._processingBlockNumber)
      }
    }
  }

  /**
   * Processes a batch of blocks concurrently.
   */
  private async processBatchBlocks(
    startBlock: number,
    latestBlockNumber: number,
  ): Promise<number> {
    const batchEndBlock = Math.min(
      startBlock + this._batchSize,
      latestBlockNumber,
    )
    const blockPromises: Promise<void>[] = []

    for (
      let blockNumber = startBlock;
      blockNumber < batchEndBlock;
      blockNumber++
    ) {
      blockPromises.push(this._processBlockFn(blockNumber))
    }

    await Promise.all(blockPromises)
    return batchEndBlock
  }

  /**
   * Handles processing errors, including retries.
   */
  private async handleProcessingError(
    processingBlockNumber: number,
  ): Promise<void> {
    const earliestSafeBlock = processingBlockNumber - this._batchSize

    await this._onError(earliestSafeBlock)
    await new Promise((res) => setTimeout(res, 1000))
  }

  private setLogInterval() {
    const BLOCKS_PER_HOUR = AVERAGE_BLOCKS_PER_DAY[this._chainId] / 24

    setInterval(() => {
      const blocksLagging =
        (this._latestBlockNumber ?? 0) - this._processingBlockNumber
      const lagInHours = (blocksLagging / BLOCKS_PER_HOUR).toFixed(1)

      this._logger.info(
        {
          lagInHours,
          blocksLagging,
          blocksPerHour: BLOCKS_PER_HOUR,
          currentHeadBlock: this._latestBlockNumber,
        },
        'Latest block cache update',
      )
    }, SIXTY_SECONDS)
  }
}
