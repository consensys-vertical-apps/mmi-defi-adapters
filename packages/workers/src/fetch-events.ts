import { type JsonRpcProvider, type Log, isError } from 'ethers'
import { logger } from './logger.js'

const TIMEOUT_IN_MS = 8_000

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
        (error instanceof Error && error.message === 'Request timed out') ||
        isError(error, 'SERVER_ERROR') ||
        (isError(error, 'UNKNOWN_ERROR') &&
          ((error.message.includes('"code": -32005') && // 10K logs limit
            toBlock - fromBlock > 1) ||
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
    setTimeout(() => reject(new Error('Request timed out')), ms),
  )
  return Promise.race([promise, timeout])
}

// workers-1  | {"level":50,"time":1739385466799,"pid":30,"hostname":"7315b30b6e57","batchIndex":186,"totalBatches":428,"batchSize":10,"totalPo
//   ols":4276,"error":"could not coalesce error (error={ \"code\": -32602, \"message\": \"Block range limit exceeded. See more details at https:
//   //docs.chainstack.com/docs/limits#evm-range-limits\" }, payload={ \"id\": 6917, \"jsonrpc\": \"2.0\", \"method\": \"eth_getLogs\", \"params\": [ { \"address\": [ \"0x1370348ab5c42873affe249b8253fdaed98c684a\", \"0x16ecbb5b1c3bcf9e6cd00ad641aaf4f9f2f62b1b\", \"0x1f7df58c60a56bc8322d3e42d7d37a0383d42746\", \"0x260370c49d63a0a3e7661b6d37877695b3dffd9e\", \"0x5afef8567414f29f0f927a0f2787b188624c10e2\", \"0x691842e57259c599ffc80bca8441d2490ce11085\", \"0xb4a9f6f77dfc30c3c4daa630b9b2d0d55007547a\", \"0xb5fb8bae0bbdde4f98420334c3a0bd7373698330\", \"0xcfa7b214587d515b1dad5f8622ff2d4bc6a74f98\", \"0xd0db39248c7287083ee9fbb41311450c1437a18b\" ], \"fromBlock\": \"0x238d99\", \"toBlock\": \"0x25c672\", \"topics\": [ \"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef\" ] } ] }, code=UNKNOWN_ERROR, version=6.12.0)","msg":"[Defi Workers] Pools batch failed"}
