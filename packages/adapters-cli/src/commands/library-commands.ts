import {
  DefiProvider,
  multiChainFilter,
  multiProductFilter,
  multiProtocolFilter,
  multiProtocolTokenAddressFilter,
} from '@metamask-institutional/defi-adapters'
import { buildPostgresPoolFilter } from '@metamask-institutional/workers'
import type { Command } from 'commander'
import { startRpcSnapshot } from '../utils/rpc-interceptor.js'
import { extractRpcMetrics } from './build-scoreboard-command.js'

export function libraryCommands(program: Command) {
  program
    .command('positions')
    .argument('[userAddress]', 'Address of the target account')
    .option(
      '-p, --protocols <protocols>',
      'comma-separated protocols filter (e.g. stargate,aave-v2)',
    )
    .option(
      '-c, --chains <chains>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
    )
    .option(
      '-t, --protocol-tokens <protocol-tokens>',
      'comma-separated protocol token address filter (e.g. 0x030..., 0x393.., 0x332...)',
    )
    .option(
      '-pd, --product-ids <product-ids>',
      'comma-separated product id filter (e.g. reward, a-token, staking)',
    )
    .showHelpAfterError()
    .action(
      async (
        userAddress,
        { protocols, productIds, chains, raw, protocolTokens },
      ) => {
        const filterProtocolIds = multiProtocolFilter(protocols)
        const filterProductIds = multiProductFilter(productIds)
        const filterChainIds = multiChainFilter(chains)

        const filterProtocolTokens =
          multiProtocolTokenAddressFilter(protocolTokens)

        const defiProvider = new DefiProvider({
          poolFilter: buildPoolFilter(),
        })

        const msw = startRpcSnapshot(
          Object.values(defiProvider.chainProvider.providers).map(
            (provider) => provider._getConnection().url,
          ),
        )

        const startTime = Date.now()
        const data = await defiProvider.getPositions({
          userAddress,
          filterProtocolIds,
          filterProductIds,
          filterChainIds,
          filterProtocolTokens,
        })
        const endTime = Date.now()

        msw.stop()

        printResponse(data)

        const rpcMetrics = extractRpcMetrics(msw.interceptedResponses)

        console.log('\nMetrics:')
        console.log(
          JSON.stringify(
            { latency: (endTime - startTime) / 1_000, ...rpcMetrics },
            null,
            2,
          ),
        )

        process.exit(0)
      },
    )

  program
    .command('support')
    .option(
      '-p, --protocols <protocols>',
      'comma-separated protocols filter (e.g. stargate,aave-v2)',
    )
    .option(
      '-c, --chains <chains>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
    )
    .option(
      '-pt, --includeProtocolTokens [includeProtocolTokens]',
      'include full protocol token data',
      false,
    )
    .showHelpAfterError()
    .action(async ({ protocols, chains, includeProtocolTokens }) => {
      const filterProtocolIds = multiProtocolFilter(protocols)
      const filterChainIds = multiChainFilter(chains)

      const defiProvider = new DefiProvider({
        poolFilter: buildPoolFilter(),
      })

      const data = await defiProvider.getSupport({
        filterChainIds,
        filterProtocolIds,
        includeProtocolTokens,
      })

      printResponse(data)
    })
}

function printResponse(data: unknown) {
  console.log(
    JSON.stringify(
      data,
      (_, value) =>
        typeof value === 'bigint' ? `${value.toString()}n` : value,
      2,
    ),
  )
}

function buildPoolFilter() {
  if (process.env.DEFI_ADAPTERS_USE_POSITIONS_CACHE !== 'true') {
    return undefined
  }

  if (!process.env.CACHE_DATABASE_URL) {
    throw new Error('CACHE_DATABASE_URL is not set')
  }

  return buildPostgresPoolFilter({
    dbUrl: process.env.CACHE_DATABASE_URL,
  })
}
