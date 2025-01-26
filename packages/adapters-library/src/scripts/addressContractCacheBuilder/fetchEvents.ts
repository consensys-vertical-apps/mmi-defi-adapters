import { isError, type Log, type JsonRpcProvider } from 'ethers'

export async function* fetchEvents({
  provider,
  contractAddresses,
  topics,
  fromBlock,
  toBlock,
  depth = 0,
}: {
  provider: JsonRpcProvider
  contractAddresses: string[]
  topics: [string | null, string | null, string | null, string | null]
  fromBlock: number
  toBlock: number
  depth?: number
}): AsyncGenerator<
  { logs: Log[]; fromBlock: number; toBlock: number; depth: number },
  void,
  unknown
> {
  const ranges: { fromBlock: number; toBlock: number; depth: number }[] = []

  ranges.push({ fromBlock, toBlock, depth })

  while (ranges.length > 0) {
    const { fromBlock, toBlock, depth } = ranges.shift()!

    try {
      const logs = await provider.getLogs({
        address: contractAddresses,
        fromBlock,
        toBlock,
        topics,
      })

      yield { logs, fromBlock, toBlock, depth }
    } catch (error) {
      if (
        !isError(error, 'UNKNOWN_ERROR') ||
        !error.message.includes('"code": -32005') ||
        toBlock - fromBlock <= 1
      ) {
        console.error('ERROR', error)
        throw error
      }

      const midBlock = Math.floor((fromBlock + toBlock) / 2)
      ranges.push({ fromBlock, toBlock: midBlock, depth: depth + 1 })
      ranges.push({ fromBlock: midBlock + 1, toBlock, depth: depth + 1 })
    }
  }
}
