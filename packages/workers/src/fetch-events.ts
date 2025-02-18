import { type JsonRpcProvider, type Log, isError } from 'ethers'
import { logger } from './logger.js'

const TIMEOUT_IN_MS = 8_000
const TIMEOUT_ERROR_MESSAGE = 'Request timed out'

export async function* fetchEvents({
  provider,
  contractAddresses,
  topic0,
  fromBlock,
  toBlock,
  depth = 0,
}: {
  provider: JsonRpcProvider
  contractAddresses: string[]
  topic0: string // Some providers (BSC) behave erratically when passing null for topic filters
  fromBlock: number
  toBlock: number
  depth?: number
}): AsyncGenerator<Log[], void, unknown> {
  const ranges: { fromBlock: number; toBlock: number; depth: number }[] = []

  ranges.push({ fromBlock, toBlock, depth })

  while (ranges.length > 0) {
    const { fromBlock, toBlock, depth } = ranges.shift()!

    try {
      const logs = await withTimeout(
        provider.getLogs({
          address: contractAddresses,
          fromBlock,
          toBlock,
          topics: [topic0],
        }),
        TIMEOUT_IN_MS,
      )

      yield logs
    } catch (error) {
      if (
        (error instanceof Error && error.message === TIMEOUT_ERROR_MESSAGE) || // Manual timeout
        isError(error, 'SERVER_ERROR') || // Any server error
        (isError(error, 'UNKNOWN_ERROR') &&
          ((error.message.includes('"code": -32005') &&
            toBlock - fromBlock > 0) || // 10K logs limit if fromBlock != toBlock
            error.message.includes('code": -32602'))) // Block range limit
      ) {
        const midBlock = Math.floor((fromBlock + toBlock) / 2)
        ranges.push({ fromBlock, toBlock: midBlock, depth: depth + 1 })
        ranges.push({ fromBlock: midBlock + 1, toBlock, depth: depth + 1 })

        continue
      }

      logger.error(
        {
          error: error instanceof Error ? error.message : error,
        },
        'Error fetching events',
      )
      throw error
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(TIMEOUT_ERROR_MESSAGE)), ms),
  )
  return Promise.race([promise, timeout])
}
