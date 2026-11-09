import type { EvmChain } from '@codefi/mmi-defi-adapters'
import { type JsonRpcProvider, type Log, isError } from 'ethers'
import type { Logger } from 'pino'
import { type CachePhase, emitRpcCall } from '../metrics/index.js'
import { TIMEOUT_ERROR_MESSAGE, withTimeout } from '../utils/with-timeout.js'

type BlockRange = {
  fromBlock: number
  toBlock: number
  depth: number
}

type GetLogsFailureResolution =
  | { action: 'rethrow' }
  | { action: 'skip' }
  | { action: 'enqueue'; ranges: Omit<BlockRange, 'depth'>[] }

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
 * Decides how to recover from a failed eth_getLogs call for a block window.
 */
function resolveGetLogsFailure(
  error: unknown,
  fromBlock: number,
  toBlock: number,
): GetLogsFailureResolution {
  if (!isRetryableGetLogsError(error, fromBlock, toBlock)) {
    return { action: 'rethrow' }
  }

  // Step: single block still failing — skip so backfill can proceed
  if (fromBlock === toBlock) {
    return { action: 'skip' }
  }

  const message = error instanceof Error ? error.message : String(error)
  const maxBlocks = parseMaxBlockRange(message)
  const rangeSize = toBlock - fromBlock + 1

  // Step: when the provider states a max block-range, chunk to that size
  if (maxBlocks !== undefined && rangeSize > maxBlocks) {
    return {
      action: 'enqueue',
      ranges: chunkBlockRange(fromBlock, toBlock, maxBlocks),
    }
  }

  // Step: unknown safe window size — bisect and retry both halves
  const midBlock = Math.floor((fromBlock + toBlock) / 2)
  return {
    action: 'enqueue',
    ranges: [
      { fromBlock, toBlock: midBlock },
      { fromBlock: midBlock + 1, toBlock },
    ],
  }
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
  chainId,
  phase = 'historic',
  depth = 0,
}: {
  provider: JsonRpcProvider
  contractAddresses: string[]
  topic0: string // Some providers (BSC) behave erratically when passing null for topic filters
  fromBlock: number
  toBlock: number
  logger: Logger
  chainId: EvmChain
  phase?: CachePhase
  depth?: number
}): AsyncGenerator<Log[], void, unknown> {
  const ranges: BlockRange[] = [{ fromBlock, toBlock, depth }]

  while (ranges.length > 0) {
    const current = ranges.shift()
    if (!current) {
      break
    }

    const {
      fromBlock: rangeFrom,
      toBlock: rangeTo,
      depth: rangeDepth,
    } = current

    try {
      // Step: count every eth_getLogs attempt, then fetch the window
      emitRpcCall({ chainId, method: 'eth_getLogs', phase })
      const logs = await withTimeout(
        provider.getLogs({
          address: contractAddresses,
          fromBlock: rangeFrom,
          toBlock: rangeTo,
          topics: [topic0],
        }),
      )

      yield logs
    } catch (error) {
      const resolution = resolveGetLogsFailure(error, rangeFrom, rangeTo)

      if (resolution.action === 'rethrow') {
        logger.error(
          {
            error,
            fromBlock: rangeFrom,
            toBlock: rangeTo,
            depth: rangeDepth,
            contractAddresses,
            topic0,
          },
          'Fetching events failed',
        )
        throw error
      }

      if (resolution.action === 'skip') {
        logger.warn(
          {
            error,
            fromBlock: rangeFrom,
            toBlock: rangeTo,
            depth: rangeDepth,
            contractAddresses,
            topic0,
          },
          'Skipping block after retryable eth_getLogs failure',
        )
        continue
      }

      // Step: enqueue chunked or bisected windows
      for (const range of resolution.ranges) {
        ranges.push({ ...range, depth: rangeDepth + 1 })
      }
    }
  }
}
