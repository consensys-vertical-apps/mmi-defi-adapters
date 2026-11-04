import { type JsonRpcProvider, type Log, isError } from 'ethers'
import type { Logger } from 'pino'
import { TIMEOUT_ERROR_MESSAGE, withTimeout } from '../utils/with-timeout.js'

/**
 * Returns true when the RPC error should trigger a range bisect (or a single-block skip).
 */
function isRetryableGetLogsError(
  error: unknown,
  fromBlock: number,
  toBlock: number,
): boolean {
  if (error instanceof Error && error.message === TIMEOUT_ERROR_MESSAGE) {
    return true
  }

  if (isError(error, 'SERVER_ERROR')) {
    return true
  }

  if (!isError(error, 'UNKNOWN_ERROR')) {
    return false
  }

  const message = error.message

  // Infura/Linea log-index holes — split when possible, skip when single block
  if (
    message.includes('code": -32000') ||
    message.includes('failed to process log index') ||
    message.includes('failed to retrieve receipts')
  ) {
    return true
  }

  // Range / result-size limits only help when the window can still shrink
  if (toBlock - fromBlock <= 0) {
    return false
  }

  return (
    message.includes('code": -32005') || // too many results
    message.includes('code": -32062') || // batch size too large
    message.includes('code": -32602') || // block range limit
    message.includes('code": -32603') // server timeout
  )
}

/**
 * Fetches event logs for the given contracts/topic, bisecting the block range on
 * retryable RPC errors. Single-block ranges that still fail with a retryable
 * provider error (e.g. Linea -32000 log-index holes) are skipped so historic
 * backfill can continue.
 */
export async function* fetchEvents({
  provider,
  contractAddresses,
  topic0,
  fromBlock,
  toBlock,
  logger,
  depth = 0,
}: {
  provider: JsonRpcProvider
  contractAddresses: string[]
  topic0: string // Some providers (BSC) behave erratically when passing null for topic filters
  fromBlock: number
  toBlock: number
  logger: Logger
  depth?: number
}): AsyncGenerator<Log[], void, unknown> {
  const ranges: { fromBlock: number; toBlock: number; depth: number }[] = []

  // Step 1: seed the work queue with the requested range
  ranges.push({ fromBlock, toBlock, depth })

  while (ranges.length > 0) {
    const { fromBlock, toBlock, depth } = ranges.shift()!

    try {
      // Step 2: attempt eth_getLogs for this window
      const logs = await withTimeout(
        provider.getLogs({
          address: contractAddresses,
          fromBlock,
          toBlock,
          topics: [topic0],
        }),
      )

      yield logs
    } catch (error) {
      if (!isRetryableGetLogsError(error, fromBlock, toBlock)) {
        logger.error(
          {
            error,
            fromBlock,
            toBlock,
            depth,
            contractAddresses,
            topic0,
          },
          'Fetching events failed',
        )
        throw error
      }

      // Step 3a: single block still failing — skip so backfill can proceed
      if (fromBlock === toBlock) {
        logger.warn(
          {
            error,
            fromBlock,
            toBlock,
            depth,
            contractAddresses,
            topic0,
          },
          'Skipping block after retryable eth_getLogs failure',
        )
        continue
      }

      // Step 3b: bisect and retry both halves
      const midBlock = Math.floor((fromBlock + toBlock) / 2)
      ranges.push({ fromBlock, toBlock: midBlock, depth: depth + 1 })
      ranges.push({ fromBlock: midBlock + 1, toBlock, depth: depth + 1 })
    }
  }
}
