import type { EvmChain } from '@codefi/mmi-defi-adapters'
import type { JsonRpcProvider } from 'ethers'
import type { Logger } from 'pino'
import { emitRpcCall } from '../metrics/index.js'
import { extractErrorMessage } from '../utils/extractErrorMessage.js'
import { withTimeout } from '../utils/with-timeout.js'

const ONE_SECOND = 1_000
const SIXTY_SECONDS = 60_000

export async function waitForBlock(
  targetBlockNumber: number,
  provider: JsonRpcProvider,
  logger: Logger,
  chainId: EvmChain,
): Promise<number> {
  let backoff = ONE_SECOND

  while (true) {
    try {
      // Step: count each eth_blockNumber poll while waiting for the target
      emitRpcCall({
        chainId,
        method: 'eth_blockNumber',
        phase: 'latest',
      })
      const latestBlockNumber = await withTimeout(provider.getBlockNumber())
      if (latestBlockNumber >= targetBlockNumber) {
        return latestBlockNumber
      }
    } catch (error) {
      logger.error(
        { error: extractErrorMessage(error) },
        'Error fetching block number',
      )
    }

    // Wait with exponential backoff before retrying
    await new Promise((resolve) => setTimeout(resolve, backoff))
    backoff = Math.min(backoff * 2, SIXTY_SECONDS)
  }
}
