import { type JsonRpcProvider, type Log, isError } from 'ethers'
import type { Logger } from 'pino'
import { TIMEOUT_ERROR_MESSAGE, withTimeout } from '../utils/with-timeout.js'

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
      )

      yield logs
    } catch (error) {
      if (
        (error instanceof Error && error.message === TIMEOUT_ERROR_MESSAGE) || // Manual timeout
        isError(error, 'SERVER_ERROR') || // Any server error
        (isError(error, 'UNKNOWN_ERROR') &&
          ((error.message.includes('"code": -32005') &&
            toBlock - fromBlock > 0) || // 10K logs limit if fromBlock != toBlock
            error.message.includes('code": -32062') || // Batch size too large
            error.message.includes('code": -32602') || // eth_getLogs is limited to 5000 block range
            error.message.includes('code": -32603'))) // Server timeout
      ) {
        const midBlock = Math.floor((fromBlock + toBlock) / 2)
        ranges.push({ fromBlock, toBlock: midBlock, depth: depth + 1 })
        ranges.push({ fromBlock: midBlock + 1, toBlock, depth: depth + 1 })

        continue
      }

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
  }
}
