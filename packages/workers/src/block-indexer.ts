import { ChainName, type Chain } from '@metamask-institutional/defi-adapters'
import { ChainIdToChainNameMap } from '@metamask-institutional/defi-adapters/dist/core/constants/chains.js'
import type { CustomJsonRpcProvider } from '@metamask-institutional/defi-adapters/dist/core/provider/CustomJsonRpcProvider.js'

import { AVERAGE_BLOCKS_PER_10_MINUTES } from '@metamask-institutional/defi-adapters/dist/core/constants/AVERAGE_BLOCKS_PER_10_MINS.js'
import { AVERAGE_BLOCKS_PER_DAY } from '@metamask-institutional/defi-adapters/dist/core/constants/AVERAGE_BLOCKS_PER_DAY.js'
import { logger } from './logger.js'

export class BlockRunner {
  private _provider: CustomJsonRpcProvider
  private _chainId: Chain
  private _chainName: string

  private static readonly _BATCH_SIZE = 50
  private static readonly _MAX_RETRIES = 5

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
    provider: CustomJsonRpcProvider
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
    this._chainName = ChainIdToChainNameMap[chainId]
  }

  private async waitForNewBlockToProcess(currentBlock: number): Promise<void> {
    let backoff = 1000 // Start with 1 second

    if (!this._latestBlockNumber) {
      this._latestBlockNumber = await this._provider.getBlockNumber()
    }

    while (currentBlock >= this._latestBlockNumber) {
      try {
        const blockNumber = await this._provider.getBlockNumber()
        logger.info(`[${this._chainName}] Latest block number: ${blockNumber}`)
        if (blockNumber > this._latestBlockNumber) {
          this._latestBlockNumber = blockNumber
          return
        }
      } catch (error) {
        logger.error(`[${this._chainName}] Error fetching block number:`, error)
      }
      await new Promise((resolve) => setTimeout(resolve, backoff))
      backoff = Math.min(backoff * 2, 60000) // Exponential backoff up to max 1 minute
    }
  }

  async start() {
    logger.info(`[${this._chainName}] Starting block indexer...`)
    let processingBlockNumber = await this._getStartBlockNumber()
    this._latestBlockNumber = await this._provider.getBlockNumber()
    let retryCount = 0

    while (retryCount <= BlockRunner._MAX_RETRIES) {
      try {
        // ensures we dont query future blocks
        if (processingBlockNumber > this._latestBlockNumber) {
          await this.waitForNewBlockToProcess(processingBlockNumber)
        }

        // if the indexer is too far behind, batch process blocks
        const shouldBatch =
          this._latestBlockNumber - processingBlockNumber >
          BlockRunner._BATCH_SIZE

        if (shouldBatch) {
          const batchEndBlock = Math.min(
            processingBlockNumber + BlockRunner._BATCH_SIZE,
            this._latestBlockNumber,
          )
          const blockPromises = []
          for (
            let blockNum = processingBlockNumber;
            blockNum < batchEndBlock;
            blockNum++
          ) {
            blockPromises.push(
              this._processBlockFn(blockNum)
                .then(() => {
                  logger.info(
                    `[${this._chainName}] Processed block ${blockNum}`,
                  )
                })
                .catch((error) => {
                  logger.error(
                    `[${this._chainName}] Error processing block ${blockNum}:`,
                    error instanceof Error ? error.stack : String(error),
                  )
                  throw error
                }),
            )
          }
          await Promise.all(blockPromises)
          processingBlockNumber = batchEndBlock
        } else {
          await this._processBlockFn(processingBlockNumber).catch((error) => {
            logger.error(
              `[${this._chainName}] Error processing block ${processingBlockNumber}:`,
              error instanceof Error ? error.stack : String(error),
            )
            throw error
          })

          logger.info(
            `[${this._chainName}] Processed block ${processingBlockNumber}`,
          )
          processingBlockNumber++
        }

        await logUpdate(this._chainId, this._provider)
      } catch (error) {
        logger.error(
          `[${this._chainName}] Error processing block ${processingBlockNumber}:`,
          error instanceof Error ? error.stack : String(error),
        )

        logger.info(
          `curl -X POST --data '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x${processingBlockNumber.toString(
            16,
          )}", true],"id":1}' -H "Content-Type: application/json" ${
            this._provider._getConnection().url
          } | jq`,
        )

        retryCount++
        if (retryCount >= BlockRunner._MAX_RETRIES) {
          const earliestSafeBlock =
            processingBlockNumber - BlockRunner._BATCH_SIZE

          await this._onError(earliestSafeBlock)

          logger.info(
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

        logger.info(
          `[${ChainIdToChainNameMap[chain]}] Indexer is ${lagInHours} hours behind, lagging ${blocksLagging} blocks.`,
        )
      }
    }
  }
}
