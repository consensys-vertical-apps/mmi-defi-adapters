import { Command } from 'commander'
import { Chain, ChainName } from '../core/constants/chains'
import { DefiProvider } from '../defiProvider'
import { multiChainFilter, multiProtocolFilter } from './commandFilters'

type RunData = {
  positions: number
  errors: number
  timeTaken: number
}

export function performance(program: Command) {
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
    .showHelpAfterError()
    .action(async ({ protocols, chains, iterations, address, batchRange }) => {
      const filterProtocolIds = multiProtocolFilter(protocols)
      const chainIds = multiChainFilter(chains) || Object.values(Chain)

      const parsedIterations = Number(iterations) || 10
      const parsedAddress =
        address || '0xaa62cf7caaf0c7e50deaa9d5d0b907472f00b258'

      if (!batchRange) {
        const data = await runPositions(
          chainIds,
          parsedIterations,
          parsedAddress,
        )

        for (const [chainId, runsData] of Object.entries(data)) {
          console.log({
            chain: ChainName[Number(chainId) as Chain],
            avgTimeTaken: `${(
              runsData.reduce((acc, curr) => acc + curr.timeTaken, 0) /
              runsData.length /
              1000
            ).toFixed(2)}s`,
            positions: runsData.reduce((acc, curr) => acc + curr.positions, 0),
            errors: runsData.reduce((acc, curr) => acc + curr.errors, 0),
          })
        }
      } else {
        const batchSizes = [1, 3, 5, 10, 20, 50, 100]
        const batchSizeResults: Partial<Record<Chain, RunData[]>>[] = []
        for (const batchSize of batchSizes) {
          const data = await runPositions(
            chainIds,
            parsedIterations,
            parsedAddress,
          )

          batchSizeResults.push(data)
        }

        for (let i = 0; i < batchSizes.length; i++) {
          console.log(`Results for batch size ${batchSizes[i]}`)
          const batchData = batchSizeResults[i]!
          for (const [chainId, runsData] of Object.entries(batchData)) {
            console.log({
              chain: ChainName[Number(chainId) as Chain],
              avgTimeTaken: `${(
                runsData.reduce((acc, curr) => acc + curr.timeTaken, 0) /
                runsData.length /
                1000
              ).toFixed(2)}s`,
              positions: runsData.reduce(
                (acc, curr) => acc + curr.positions,
                0,
              ),
              errors: runsData.reduce((acc, curr) => acc + curr.errors, 0),
            })
          }
        }
      }
    })
}

async function runPositions(
  chainIds: Chain[],
  iterations: number,
  userAddress: string,
) {
  const allData: Partial<Record<Chain, RunData[]>> = {}

  for (const chainId of chainIds) {
    if (chainId === Chain.Bsc) {
      continue
    }

    const runsData: RunData[] = []
    for (let i = 0; i < iterations; i++) {
      const defiProvider = new DefiProvider()
      const startTime = Date.now()
      const positions = await defiProvider.getPositions({
        userAddress,
        filterChainIds: [chainId],
      })
      const endTime = Date.now()

      const result = positions.reduce(
        (acc, position) => {
          if (position.success) {
            acc.positions++
          } else {
            acc.errors++
          }

          return acc
        },
        {
          positions: 0,
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
