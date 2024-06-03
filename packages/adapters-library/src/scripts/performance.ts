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
    .showHelpAfterError()
    .action(async ({ protocols, chains, iterations, address }) => {
      const filterProtocolIds = multiProtocolFilter(protocols)
      const chainIds = multiChainFilter(chains) || Object.values(Chain)

      const maxBatchSize = 5
      const parsedIterations = Number(iterations) || 3
      const parsedAddress =
        address || '0xaa62cf7caaf0c7e50deaa9d5d0b907472f00b258'

      const allData: Partial<Record<Chain, RunData[]>> = {}
      for (const chainId of chainIds) {
        if (chainId === Chain.Bsc) {
          continue
        }

        const runsData: RunData[] = []
        for (let i = 0; i < parsedIterations; i++) {
          const defiProvider = new DefiProvider({
            maxBatchSize,
          })
          const startTime = Date.now()
          const positions = await defiProvider.getPositions({
            userAddress: parsedAddress,
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

      for (const [chainId, runsData] of Object.entries(allData)) {
        console.log({
          chain: ChainName[Number(chainId) as Chain],
          maxBatchSize,
          avgTimeTaken: `${(
            runsData.reduce((acc, curr) => acc + curr.timeTaken, 0) /
            runsData.length /
            1000
          ).toFixed(2)}s`,
          positions: runsData.reduce((acc, curr) => acc + curr.positions, 0),
          errors: runsData.reduce((acc, curr) => acc + curr.errors, 0),
        })
      }
    })
}
