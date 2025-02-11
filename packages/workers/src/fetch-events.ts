import { type JsonRpcProvider, type Log, isError } from 'ethers'
import { logger } from './logger.js'

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
      const logs = await provider.getLogs({
        address: contractAddresses,
        fromBlock,
        toBlock,
        topics: [topic0],
      })

      yield logs
    } catch (error) {
      if (
        !isError(error, 'UNKNOWN_ERROR') ||
        !error.message.includes('"code": -32005') ||
        toBlock - fromBlock <= 1
      ) {
        logger.error(
          {
            error: error instanceof Error ? error.message : error,
          },
          'Error fetching events',
        )
        throw error
      }

      const midBlock = Math.floor((fromBlock + toBlock) / 2)
      ranges.push({ fromBlock, toBlock: midBlock, depth: depth + 1 })
      ranges.push({ fromBlock: midBlock + 1, toBlock, depth: depth + 1 })
    }
  }
}
