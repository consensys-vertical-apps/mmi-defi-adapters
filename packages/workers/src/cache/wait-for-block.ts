import type { JsonRpcProvider } from 'ethers'
import type { Logger } from 'pino'
import { extractErrorMessage } from '../utils/extractErrorMessage.js'
import { withTimeout } from '../utils/with-timeout.js'

const ONE_SECOND = 1_000
const SIXTY_SECONDS = 60_000

export async function waitForBlock(
  targetBlockNumber: number,
  provider: JsonRpcProvider,
  logger: Logger,
): Promise<number> {
  let backoff = ONE_SECOND

  while (true) {
    try {
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
