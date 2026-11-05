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

  const message = error instanceof Error ? error.message : String(error)

  // Provider block-range caps (e.g. Robinhood: "range 10408 exceeds limit of 10000")
  // Match on message text — ethers may wrap these outside UNKNOWN_ERROR.
  const isBlockRangeLimit =
    /exceeds limit of \d+/i.test(message) ||
    message.toLowerCase().includes('block range') ||
    message.includes('eth_getLogs is limited')

  // Infura/Linea log-index holes — split when possible, skip when single block
  const isLogIndexHole =
    message.includes('code": -32000') ||
    message.includes('failed to process log index') ||
    message.includes('failed to retrieve receipts')

  if (isBlockRangeLimit || isLogIndexHole) {
    return toBlock - fromBlock > 0 || isLogIndexHole
  }

  if (!isError(error, 'UNKNOWN_ERROR')) {
    return false
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
 * Parses a provider max block-range from known eth_getLogs error messages.
 */
function parseMaxBlockRange(message: string): number | undefined {
  // Step 1: Robinhood / Orbit style — "range 166542 exceeds limit of 10000"
  const exceedsMatch = message.match(/exceeds limit of (\d+)/i)
  if (exceedsMatch) {
    return Number(exceedsMatch[1])
  }

  // Step 2: Infura style — "eth_getLogs is limited to 5000 block range"
  const limitedMatch = message.match(
    /eth_getLogs is limited to (\d+) block range/i,
  )
  if (limitedMatch) {
    return Number(limitedMatch[1])
  }

  return undefined
}

/**
 * Splits [fromBlock, toBlock] into consecutive windows of at most maxBlocks (inclusive).
 */
function chunkBlockRange(
  fromBlock: number,
  toBlock: number,
  maxBlocks: number,
): { fromBlock: number; toBlock: number }[] {
  const chunks: { fromBlock: number; toBlock: number }[] = []
  let start = fromBlock

  // Step: walk the window in inclusive slices of maxBlocks
  while (start <= toBlock) {
    const end = Math.min(start + maxBlocks - 1, toBlock)
    chunks.push({ fromBlock: start, toBlock: end })
    start = end + 1
  }

  return chunks
}

/**
 * Fetches event logs for the given contracts/topic. On retryable RPC errors with a
 * known max block-range, chunks the window to that size; otherwise bisects.
 * Single-block ranges that still fail with a retryable provider error
 * (e.g. Linea -32000 log-index holes) are skipped so historic backfill can continue.
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

      const message = error instanceof Error ? error.message : String(error)
      const maxBlocks = parseMaxBlockRange(message)
      const rangeSize = toBlock - fromBlock + 1

      // Step 3b: when the provider states a max block-range, chunk to that size
      if (maxBlocks !== undefined && rangeSize > maxBlocks) {
        for (const chunk of chunkBlockRange(fromBlock, toBlock, maxBlocks)) {
          ranges.push({ ...chunk, depth: depth + 1 })
        }
        continue
      }

      // Step 3c: unknown safe window size — bisect and retry both halves
      const midBlock = Math.floor((fromBlock + toBlock) / 2)
      ranges.push({ fromBlock, toBlock: midBlock, depth: depth + 1 })
      ranges.push({ fromBlock: midBlock + 1, toBlock, depth: depth + 1 })
    }
  }
}
