import { Command } from 'commander'
import { Protocol } from '../adapters/protocols'
import { Chain } from '../core/constants/chains'
import { bigintJsonStringify } from '../core/utils/bigintJson'
import { filterMapSync } from '../core/utils/filters'
import { DefiProvider } from '../defiProvider'
import { AdapterResponse, GetEventsRequestInput } from '../types/response'
import { multiChainFilter, multiProtocolFilter } from './commandFilters'

export function featureCommands(program: Command, defiProvider: DefiProvider) {
  addressCommand(
    program,
    'positions',
    defiProvider.getPositions.bind(defiProvider),
    '0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255',
  )
  addressCommand(
    program,
    'profits',
    defiProvider.getProfits.bind(defiProvider),
    '0xCEadFdCCd0E8E370D985c49Ed3117b2572243A4a',
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

  protocolCommand(program, 'prices', defiProvider.getPrices.bind(defiProvider))
  protocolCommand(
    program,
    'tvl',
    defiProvider.getTotalValueLocked.bind(defiProvider),
  )
  protocolCommand(program, 'apr', defiProvider.getApr.bind(defiProvider))
  protocolCommand(program, 'apy', defiProvider.getApy.bind(defiProvider))
}

function addressCommand(
  program: Command,
  commandName: string,
  feature: (input: {
    userAddress: string
    filterProtocolIds?: Protocol[]
    filterChainIds?: Chain[]
  }) => Promise<AdapterResponse<unknown>[]>,
  defaultAddress: string,
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
    .showHelpAfterError()
    .action(async (userAddress, { protocols, chains }) => {
      const filterProtocolIds = multiProtocolFilter(protocols)
      const filterChainIds = multiChainFilter(chains)

      const data = await feature({
        userAddress,
        filterProtocolIds,
        filterChainIds,
      })

      printResponse(filterResponse(data))
    })
}

// npm run deposits 0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5 18262162 18262163 0xC36442b4a4522E871399CD717aBDD847Ab11FE88 567587 uniswapV3 1 pool

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
  defaultTokenId: string,
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
          fromBlock: parseInt(fromBlock, 10),
          toBlock: parseInt(toBlock, 10),
          protocolTokenAddress,
          productId,
          protocolId,
          chainId: parseInt(chainId) as Chain,
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
    .showHelpAfterError()
    .action(async ({ protocols, chains }) => {
      const filterProtocolIds = multiProtocolFilter(protocols)
      const filterChainIds = multiChainFilter(chains)

      const data = await feature({
        filterProtocolIds,
        filterChainIds,
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
