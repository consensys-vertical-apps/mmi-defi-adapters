import {
  Chain,
  ChainName,
  DefiProvider,
  multiChainFilter,
  multiProtocolFilter,
} from '@metamask-institutional/defi-adapters'
import type { Command } from 'commander'

type RunData = {
  positions: number
  positionsWithPrices: number
  errors: number
  timeTaken: number
}

export function performanceCommand(program: Command) {
  program
    .command('performance')
    .option(
      '-p, --protocols <protocols>',
      'comma-separated protocols filter (e.g. stargate,aave-v2)',
    )
    .option(
      '-c, --chains <chains>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
    )
    .option(
      '-n, --iterations <iterations>',
      'number of times to run the performance test',
    )
    .option('-a, --address <address>', 'address used to run the tests')
    .option('-br, --batch-range', 'test multiple batch ranges')
    .option('-sb, --stable-blocks', 'use a stable block number')
    .showHelpAfterError()
    .action(
      async ({
        protocols,
        chains,
        iterations,
        address,
        batchRange,
        stableBlocks,
      }) => {
        const filterProtocolIds = multiProtocolFilter(protocols)
        const chainIds = multiChainFilter(chains) || Object.values(Chain)

        const parsedIterations = Number(iterations) || 5
        const parsedAddress =
          address || '0xaa62cf7caaf0c7e50deaa9d5d0b907472f00b258'

        if (batchRange) {
          const batchSizes = [1, 3, 5, 10, 20, 50, 100]
          const batchSizeResults: Partial<Record<Chain, RunData[]>>[] = []
          for (const batchSize of batchSizes) {
            const data = await runPositions({
              chainIds,
              iterations: parsedIterations,
              userAddress: parsedAddress,
              maxBatchSize: batchSize,
              stableBlocks,
            })

            batchSizeResults.push(data)
          }

          for (let i = 0; i < batchSizes.length; i++) {
            console.log(`Results for batch size ${batchSizes[i]}`)
            printData(batchSizeResults[i]!)
          }
          return
        }

        const data = await runPositions({
          chainIds,
          iterations: parsedIterations,
          userAddress: parsedAddress,
          stableBlocks,
        })

        printData(data)
        return
      },
    )
}

async function runPositions({
  chainIds,
  iterations,
  userAddress,
  maxBatchSize,
  stableBlocks,
}: {
  chainIds: Chain[]
  iterations: number
  userAddress: string
  maxBatchSize?: number
  stableBlocks: boolean
}) {
  const allData: Partial<Record<Chain, RunData[]>> = {}

  for (const chainId of chainIds) {
    if (chainId === Chain.Bsc) {
      continue
    }

    const runsData: RunData[] = []
    for (let i = 0; i < iterations; i++) {
      console.log('Running positions', { chainId, iteration: i, maxBatchSize })
      const config = maxBatchSize
        ? {
            maxBatchSize: {
              [ChainName[chainId]]: maxBatchSize,
            },
          }
        : undefined
      const defiProvider = new DefiProvider({ config })

      const startTime = Date.now()
      const positions = await defiProvider.getPositions({
        userAddress,
        filterChainIds: [chainId],
        blockNumbers: stableBlocks
          ? await defiProvider.getStableBlockNumbers()
          : undefined,
      })
      const endTime = Date.now()

      const result = positions.reduce(
        (acc, position) => {
          if (position.success) {
            acc.positions++

            if (position.tokens.every(hasPrices)) {
              acc.positionsWithPrices++
            }
          } else {
            acc.errors++
          }

          return acc
        },
        {
          positions: 0,
          positionsWithPrices: 0,
          errors: 0,
          timeTaken: endTime - startTime,
        },
      )

      runsData.push(result)
    }
    allData[chainId] = runsData
  }

  return allData
}

type Token = {
  tokens?: Token[]
  price?: number
}

function hasPrices(token: Token): boolean {
  if (!token.tokens || token.tokens.length === 0) {
    return !!token.price
  }

  return token.tokens.every(hasPrices)
}

function printData(data: Partial<Record<Chain, RunData[]>>) {
  for (const [chainId, runsData] of Object.entries(data)) {
    console.log({
      chain: ChainName[Number(chainId) as Chain],
      avgTimeTaken: `${(
        runsData.reduce((acc, curr) => acc + curr.timeTaken, 0) /
          runsData.length /
          1000
      ).toFixed(2)}s`,
      positions: runsData.reduce((acc, curr) => acc + curr.positions, 0),
      positionsWithPrices: runsData.reduce(
        (acc, curr) => acc + curr.positionsWithPrices,
        0,
      ),
      errors: runsData.reduce((acc, curr) => acc + curr.errors, 0),
    })
  }
}
