import {
  DefiProvider,
  type DefiPositionDetection,
  multiChainFilter,
  multiProductFilter,
  multiProtocolFilter,
  multiProtocolTokenAddressFilter,
} from '@metamask-institutional/defi-adapters'
import { buildPostgresPoolFilter } from '@metamask-institutional/workers'
import type { Command } from 'commander'
import { startRpcSnapshot } from '../utils/rpc-interceptor.ts'
import { extractRpcMetrics } from './build-scoreboard-command.ts'

const DEFAULT_USER_ADDRESS = '0x47ab2ba28c381011fa1f25417c4c2b2c0d5b4781'
const DEFAULT_MAX_POOLS_PER_ADAPTER_TO_CHECK = 10

export function libraryCommands(program: Command) {
  program
    .command('positions')
    .argument(
      '[userAddress]',
      'Address of the target account',
      DEFAULT_USER_ADDRESS,
    )
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

        console.log(`Get positions for address ${DEFAULT_USER_ADDRESS}`)

        const filterProtocolTokens =
          multiProtocolTokenAddressFilter(protocolTokens)

        const filterUsingLocalIndex =
          buildDefiPositionDetectionUsingLocalIndex()

        if (!filterUsingLocalIndex && !filterProtocolTokens) {
          console.log(
            `No DeFi positions cache detected max ${DEFAULT_MAX_POOLS_PER_ADAPTER_TO_CHECK} pools per adapter per chain only.`,
          )
        }

        const filter: DefiPositionDetection = async (userAddress, chainId) => {
          if (filterUsingLocalIndex) {
            return buildDefiPositionDetectionUsingLocalIndex()!(
              userAddress,
              chainId,
            )
          }

          if (filterProtocolTokens) {
            return undefined // Use protocol token filter if provided no pool filter required
          }

          const defiProvider = new DefiProvider()
          const support = await defiProvider.getSupport({
            filterChainIds: [chainId],
            filterProtocolIds,
            filterProductIds,
          })
          // Flatten all protocolTokenAddresses from support object
          const protocolTokenAddresses = Object.values(support)
            .flat(2)
            .flatMap((protocol) =>
              (protocol.protocolTokenAddresses?.[chainId] ?? []).slice(
                0,
                DEFAULT_MAX_POOLS_PER_ADAPTER_TO_CHECK,
              ),
            )

          console.debug(
            `Using ${protocolTokenAddresses.length} protocol token addresses as filter for chain ${chainId}`,
          )

          return {
            contractAddresses: protocolTokenAddresses,
          }
        }

        const defiProvider = new DefiProvider({
          defiPositionDetection: filter,
        })

        const msw = startRpcSnapshot(
          Object.values(defiProvider.chainProvider.providers).map(
            (provider) => provider._getConnection().url,
          ),
        )

        const startTime = Date.now()
        const data = await defiProvider.getPositions({
          userAddress: userAddress,
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
      '-pd, --product-ids <product-ids>',
      'comma-separated product id filter (e.g. reward, a-token, staking)',
    )
    .option(
      '-pt, --includeProtocolTokens [includeProtocolTokens]',
      'include full protocol token data',
      false,
    )
    .option(
      '-e, --filterWhereUserEventMissing [filterWhereUserEventMissing]',
      'missing user event filter',
      false,
    )
    .showHelpAfterError()
    .action(
      async ({
        protocols,
        chains,
        productIds,
        includeProtocolTokens,
        filterWhereUserEventMissing,
      }) => {
        const filterProtocolIds = multiProtocolFilter(protocols)
        const filterChainIds = multiChainFilter(chains)
        const filterProductIds = multiProductFilter(productIds)

        const defiProvider = new DefiProvider({
          defiPositionDetection: buildDefiPositionDetectionUsingLocalIndex(),
        })

        const data = await defiProvider.getSupport({
          filterChainIds,
          filterProtocolIds,
          includeProtocolTokens,
          filterWhereUserEventMissing,
          filterProductIds,
        })

        printResponse(data)
      },
    )
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

function buildDefiPositionDetectionUsingLocalIndex() {
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
