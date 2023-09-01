import { Command } from 'commander'
import {
  getApr,
  getApy,
  getDeposits,
  getPositions,
  getPrices,
  getTodaysProfits,
  getTotalValueLocked,
  getWithdrawals,
} from '..'
import { Chain } from '../core/constants/chains'
import { Protocol } from '../adapters'

export function addFeatureCommands(program: Command) {
  addressCommand(
    program,
    'positions',
    getPositions,
    '0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255',
  )
  addressCommand(
    program,
    'profits',
    getTodaysProfits,
    '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b',
  )

  addressEventsCommand(
    program,
    'deposits',
    getDeposits,
    '0x2C5D4A0943e9cF4C597a76464396B0bF84C24C45',
    17719334,
    17719336,
  )
  addressEventsCommand(
    program,
    'withdrawals',
    getWithdrawals,
    '0x4Ffc5F22770ab6046c8D66DABAe3A9CD1E7A03e7',
    17979753,
    17979755,
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
    filterProtocolId?: Protocol
    filterChainId?: Chain
  }) => Promise<unknown>,
  defaultAddress: string,
) {
  program
    .command(commandName)
    .argument('[userAddress]', 'Address of the target account', defaultAddress)
    .option('-p, --protocol <protocolId>', 'protocol filter')
    .option('-c, --chain <chainId>', 'chain filter')
    .showHelpAfterError()
    .action(async (userAddress, { protocol, chain }) => {
      const data = await feature({
        userAddress,
        filterProtocolId: protocol,
        filterChainId: chain,
      })

      beautifyJsonOutput(data)
    })
}

function addressEventsCommand(
  program: Command,
  commandName: string,
  feature: (input: {
    userAddress: string
    fromBlock: number
    toBlock: number
    filterProtocolId?: Protocol
    filterChainId?: Chain
  }) => Promise<unknown>,
  defaultAddress: string,
  defaultFromBlock: number,
  defaultToBlock: number,
) {
  program
    .command(commandName)
    .argument('[userAddress]', 'Address of the target account', defaultAddress)
    .argument('[fromBlock]', 'From block', defaultFromBlock)
    .argument('[toBlock]', 'To block', defaultToBlock)
    .option('-p, --protocol <protocolId>', 'protocol filter')
    .option('-c, --chain <chainId>', 'chain filter')
    .showHelpAfterError()
    .action(async (userAddress, fromBlock, toBlock, { protocol, chain }) => {
      const data = await feature({
        userAddress,
        filterProtocolId: protocol,
        filterChainId: chain,
        fromBlock,
        toBlock,
      })

      beautifyJsonOutput(data)
    })
}

function protocolCommand(
  program: Command,
  commandName: string,
  feature: (input: {
    filterProtocolId?: Protocol
    filterChainId?: Chain
  }) => Promise<unknown>,
) {
  program
    .command(commandName)
    .option('-p, --protocol <protocolId>', 'protocol filter')
    .option('-c, --chain <chainId>', 'chain filter')
    .showHelpAfterError()
    .action(async ({ protocol, chain }) => {
      const data = await feature({
        filterProtocolId: protocol,
        filterChainId: chain,
      })

      beautifyJsonOutput(data)
    })
}

function beautifyJsonOutput<T>(jsonString: T) {
  console.log(
    JSON.stringify(
      jsonString,
      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    ),
  )
}
