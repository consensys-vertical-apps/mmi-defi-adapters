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
import { GetEventsRequestInput } from '../types/response'
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
    '0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5',
    18262162,
    18262164,
    '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    '573046',
    'pool',
    Protocol.UniswapV3,
    Chain.Ethereum.toString(),
  )
  addressEventsCommand(
    program,
    'withdrawals',
    getWithdrawals,
    '0x1d201a9B9f136dE7e7fF4A80a27e96Af7789D9BE',
    18274545,
    18274547,
    '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    '573517',
    'pool',
    Protocol.UniswapV3,
    Chain.Ethereum.toString(),
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
  }) => Promise<unknown>,
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

// npm run deposits 0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5 18262162 18262163 0xC36442b4a4522E871399CD717aBDD847Ab11FE88 567587 uniswapV3 1 pool

function addressEventsCommand(
  program: Command,
  commandName: string,
  feature: (input: GetEventsRequestInput) => Promise<unknown>,
  defaultAddress: string,
  defaultFromBlock: number,
  defaultToBlock: number,
  defaultProtocolTokenAddress: string,
  defaultTokenId: string,
  defaultProduct: string,
  defaultProtocolId: Protocol,
  defaultChainId: string,
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
    .argument('[protocolId]', 'Name of product', defaultProtocolId)
    .argument('[chainId]', 'Name of product', defaultChainId)
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
          chainId: parseInt(chainId) as Chain,
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
  }) => Promise<unknown>,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function printResponse(data: any) {
  console.log(bigintJsonStringify(data, 2))
}
