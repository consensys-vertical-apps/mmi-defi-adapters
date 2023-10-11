import { Command } from 'commander'
import {
  getApr,
  getApy,
  getDeposits,
  getPositions,
  getPrices,
  getProfits,
  getTotalValueLocked,
  getWithdrawals,
} from '..'
import { Protocol } from '../adapters/protocols'
import { Chain } from '../core/constants/chains'
import { bigintJsonStringify } from '../core/utils/bigintJson'
import { filterMapSync } from '../core/utils/filters'
import { AdapterResponse, GetEventsRequestInput } from '../types/response'
import { multiChainFilter, multiProtocolFilter } from './commandFilters'

export function featureCommands(program: Command) {
  addressCommand(
    program,
    'positions',
    getPositions,
    '0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255',
  )
  addressCommand(
    program,
    'profits',
    getProfits,
    '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b',
  )

  addressEventsCommand(
    program,
    'deposits',
    getDeposits,
    '0x2C5D4A0943e9cF4C597a76464396B0bF84C24C45',
    17719334,
    17719336,
    '0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5',
    '177790',
    'pool',
  )
  addressEventsCommand(
    program,
    'withdrawals',
    getWithdrawals,
    '0x4Ffc5F22770ab6046c8D66DABAe3A9CD1E7A03e7',
    17979753,
    17979755,
    '0xdf0770df86a8034b3efef0a1bb3c889b8332ff56',
    '177790',
    'pool',
  )

  protocolCommand(program, 'prices', getPrices)
  protocolCommand(program, 'tvl', getTotalValueLocked)
  protocolCommand(program, 'apr', getApr)
  protocolCommand(program, 'apy', getApy)
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

      printResponse(data)
    })
}

function addressEventsCommand(
  program: Command,
  commandName: string,
  feature: (input: GetEventsRequestInput) => Promise<AdapterResponse<unknown>>,
  defaultAddress: string,
  defaultFromBlock: number,
  defaultToBlock: number,
  defaultProtocolTokenAddress: string,
  defaultTokenId: string,
  defaultProduct: string,
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
    .argument('[tokenId]', 'Token Id of the position', defaultTokenId)
    .argument('[product]', 'Name of product', defaultProduct)
    .showHelpAfterError()
    .action(
      async (
        userAddress,
        fromBlock,
        toBlock,
        protocolTokenAddress,
        tokenId,
        product,
        protocolId,
        chainId,
      ) => {
        const data = await feature({
          userAddress,
          fromBlock: parseInt(fromBlock, 10),
          toBlock: parseInt(toBlock, 10),
          protocolTokenAddress,
          tokenId,
          product,
          protocolId,
          chainId,
        })

        printResponse([data])
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

      printResponse(data)
    })
}

function printResponse(data: AdapterResponse<unknown>[]) {
  const filteredData = filterMapSync(data, (adapterResponse) => {
    if (
      !adapterResponse.success &&
      adapterResponse.error.details?.name === 'NotApplicableError'
    ) {
      return undefined
    }

    return adapterResponse
  })
  console.log(bigintJsonStringify(filteredData, 2))
}
