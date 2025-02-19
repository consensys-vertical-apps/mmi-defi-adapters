import { Command } from 'commander'
import { Protocol } from '../adapters/protocols'

import { Chain } from '../core/constants/chains'

import { bigintJsonStringify } from '../core/utils/bigintJson'
import { filterMapSync } from '../core/utils/filters'
import {
  multiChainFilter,
  multiProductFilter,
  multiProtocolFilter,
  multiProtocolTokenAddressFilter,
} from '../core/utils/input-filters'
import { DefiProvider } from '../defiProvider'
import { startRpcSnapshot } from '../tests/rpcInterceptor'
import { AdapterResponse, GetEventsRequestInput } from '../types/response'
import { extractRpcMetrics } from './buildScoreboard'
import { simulateTx } from './simulator/simulateTx'

export function featureCommands(program: Command, defiProvider: DefiProvider) {
  addressCommand(
    program,
    'positions',
    defiProvider.getPositions.bind(defiProvider),
    '0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255',
    defiProvider,
  )
  addressCommand(
    program,
    'profits',
    defiProvider.getProfits.bind(defiProvider),
    '0xCEadFdCCd0E8E370D985c49Ed3117b2572243A4a',
    defiProvider,
  )

  addressEventsCommand(
    program,
    'deposits',
    defiProvider.getDeposits.bind(defiProvider),
    '0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5',
    18262163,
    18262164,
    '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    'pool',
    Protocol.UniswapV3,
    Chain.Ethereum.toString(),
    '573046',
  )
  addressEventsCommand(
    program,
    'withdrawals',
    defiProvider.getWithdrawals.bind(defiProvider),
    '0x1d201a9B9f136dE7e7fF4A80a27e96Af7789D9BE',
    18274545,
    18274547,
    '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    'pool',
    Protocol.UniswapV3,
    Chain.Ethereum.toString(),
    '573517',
  )

  protocolCommand(program, 'unwrap', defiProvider.unwrap.bind(defiProvider))

  protocolCommand(
    program,
    'tvl',
    defiProvider.getTotalValueLocked.bind(defiProvider),
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

      const data = await defiProvider.getSupport({
        filterChainIds,
        filterProtocolIds,
        includeProtocolTokens,
      })

      printResponse(data)
    })
}

function addressCommand(
  program: Command,
  commandName: string,
  feature: (input: {
    userAddress: string
    filterProtocolIds?: Protocol[]
    filterProductIds?: string[]
    filterChainIds?: Chain[]
    includeRawValues?: boolean
    filterProtocolTokens?: string[]
  }) => Promise<AdapterResponse<unknown>[]>,
  defaultAddress: string,
  defiProvider: DefiProvider,
) {
  program
    .command(commandName)
    .argument('[userAddress]', 'Address of the target account', defaultAddress)
    .option(
      '-p, --protocols <protocols>',
      'comma-separated protocols filter (e.g. stargate,aave-v2)',
    )
    .option(
      '-c, --chains <chains>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
    )
    .option(
      '-r, --raw <raw>',
      'true or false to include raw values, available on profits requests only (e.g. true)',
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

        const includeRawValues = raw === 'true'

        const msw = startRpcSnapshot(
          Object.values(defiProvider.chainProvider.providers).map(
            (provider) => provider._getConnection().url,
          ),
        )

        const startTime = Date.now()
        const data = await feature({
          userAddress,
          filterProtocolIds,
          filterProductIds,
          filterChainIds,
          includeRawValues,
          filterProtocolTokens,
        })
        const endTime = Date.now()

        msw.stop()

        printResponse(filterResponse(data))

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
}

function addressEventsCommand(
  program: Command,
  commandName: string,
  feature: (input: GetEventsRequestInput) => Promise<AdapterResponse<unknown>>,
  defaultAddress: string,
  defaultFromBlock: number,
  defaultToBlock: number,
  defaultProtocolTokenAddress: string,
  defaultProductId: string,
  defaultProtocolId: Protocol,
  defaultChainId: string,
  defaultTokenId?: string,
) {
  program
    .command(commandName)
    .argument('[userAddress]', 'Address of the target account', defaultAddress)
    .argument('[fromBlock]', 'From block', defaultFromBlock)
    .argument('[toBlock]', 'To block', defaultToBlock)
    .argument(
      '[protocolTokenAddress]',
      'Address of the protocol token',
      defaultProtocolTokenAddress,
    )
    .argument('[productId]', 'Name of product', defaultProductId)
    .argument('[protocolId]', 'Name of product', defaultProtocolId)
    .argument('[chainId]', 'Name of product', defaultChainId)
    .argument('[tokenId]', 'Token Id of the position', defaultTokenId)
    .showHelpAfterError()
    .action(
      async (
        userAddress,
        fromBlock,
        toBlock,
        protocolTokenAddress,
        productId,
        protocolId,
        chainId,
        tokenId,
      ) => {
        const data = await feature({
          userAddress,
          fromBlock: Number.parseInt(fromBlock, 10),
          toBlock: Number.parseInt(toBlock, 10),
          protocolTokenAddress,
          productId,
          protocolId,
          chainId: Number.parseInt(chainId) as Chain,
          tokenId,
        })

        printResponse(data)
      },
    )
}

function protocolCommand(
  program: Command,
  commandName: string,
  feature: (input: {
    filterProtocolIds?: Protocol[]
    filterChainIds?: Chain[]
    filterProtocolTokens?: string[]
    filterProductIds?: string[]
  }) => Promise<AdapterResponse<unknown>[]>,
) {
  program
    .command(commandName)
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
    .action(async ({ protocols, chains, protocolTokens, productIds }) => {
      const filterProtocolIds = multiProtocolFilter(protocols)
      const filterProductIds = multiProductFilter(productIds)
      const filterChainIds = multiChainFilter(chains)

      const filterProtocolTokens =
        multiProtocolTokenAddressFilter(protocolTokens)

      const data = await feature({
        filterProtocolIds,
        filterChainIds,
        filterProtocolTokens,
        filterProductIds,
      })

      printResponse(filterResponse(data))
    })
}

function filterResponse(
  data: AdapterResponse<unknown>[],
): AdapterResponse<unknown>[] {
  return filterMapSync(data, (adapterResponse) => {
    if (
      !adapterResponse.success &&
      adapterResponse.error.details?.name === 'NotApplicableError'
    ) {
      return undefined
    }

    return adapterResponse
  })
}

function printResponse(data: unknown) {
  console.log(bigintJsonStringify(data, 2))
}
