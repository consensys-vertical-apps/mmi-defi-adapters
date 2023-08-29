import { Command } from 'commander'
import {
  getApr,
  getApy,
  getDeposits,
  getPositions,
  getPrices,
  getTodaysProfits,
  getTotalValueLocked,
} from '..'

export function addFeatureCommands(program: Command) {
  program
    .command('positions')
    .argument(
      '[userAddress]',
      'Address of the target account',
      '0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255',
    )
    .option('-p, --protocol <protocolId>', 'protocol filter')
    .option('-c, --chain <chainId>', 'chain filter')
    .showHelpAfterError()
    .action(async (userAddress, { protocol, chain }) => {
      const data = await getPositions({
        userAddress,
        filterProtocolId: protocol,
        filterChainId: chain,
      })

      beautifyJsonOutput(data)
    })

  program
    .command('profits')
    .argument(
      '[userAddress]',
      'Address of the target account',
      '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b',
    )
    .option('-p, --protocol <protocolId>', 'protocol filter')
    .option('-c, --chain <chainId>', 'chain filter')
    .showHelpAfterError()
    .action(async (userAddress, { protocol, chain }) => {
      const data = await getTodaysProfits({
        userAddress,
        filterProtocolId: protocol,
        filterChainId: chain,
      })

      beautifyJsonOutput(data)
    })

  program
    .command('deposits')
    .argument(
      '[userAddress]',
      'Address of the target account',
      '0x2C5D4A0943e9cF4C597a76464396B0bF84C24C45',
    )
    .argument('[fromBlock]', 'From block', 17719334)
    .argument('[toBlock]', 'To block', 17719336)
    .option('-p, --protocol <protocolId>', 'protocol filter')
    .option('-c, --chain <chainId>', 'chain filter')
    .showHelpAfterError()
    .action(async (userAddress, fromBlock, toBlock, { protocol, chain }) => {
      const data = await getDeposits({
        userAddress,
        filterProtocolId: protocol,
        filterChainId: chain,
        fromBlock,
        toBlock,
      })

      beautifyJsonOutput(data)
    })

  program
    .command('withdrawals')
    .argument(
      '[userAddress]',
      'Address of the target account',
      '0x4Ffc5F22770ab6046c8D66DABAe3A9CD1E7A03e7',
    )
    .argument('[fromBlock]', 'From block', 17979753)
    .argument('[toBlock]', 'To block', 17979755)
    .option('-p, --protocol <protocolId>', 'protocol filter')
    .option('-c, --chain <chainId>', 'chain filter')
    .showHelpAfterError()
    .action(async (userAddress, fromBlock, toBlock, { protocol, chain }) => {
      const data = await getDeposits({
        userAddress,
        filterProtocolId: protocol,
        filterChainId: chain,
        fromBlock,
        toBlock,
      })

      beautifyJsonOutput(data)
    })

  program
    .command('prices')
    .option('-p, --protocol <protocolId>', 'protocol filter')
    .option('-c, --chain <chainId>', 'chain filter')
    .showHelpAfterError()
    .action(async ({ protocol, chain }) => {
      const data = await getPrices({
        filterProtocolId: protocol,
        filterChainId: chain,
      })

      beautifyJsonOutput(data)
    })

  program
    .command('tvl')
    .option('-p, --protocol <protocolId>', 'protocol filter')
    .option('-c, --chain <chainId>', 'chain filter')
    .showHelpAfterError()
    .action(async ({ protocol, chain }) => {
      const data = await getTotalValueLocked({
        filterProtocolId: protocol,
        filterChainId: chain,
      })

      beautifyJsonOutput(data)
    })

  program
    .command('apy')
    .option('-p, --protocol <protocolId>', 'protocol filter')
    .option('-c, --chain <chainId>', 'chain filter')
    .showHelpAfterError()
    .action(async ({ protocol, chain }) => {
      const data = await getApy({
        filterProtocolId: protocol,
        filterChainId: chain,
      })

      beautifyJsonOutput(data)
    })

  program
    .command('apr')
    .option('-p, --protocol <protocolId>', 'protocol filter')
    .option('-c, --chain <chainId>', 'chain filter')
    .showHelpAfterError()
    .action(async ({ protocol, chain }) => {
      const data = await getApr({
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
