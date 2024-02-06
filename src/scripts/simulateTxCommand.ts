import { Command } from 'commander'
import { Chain } from '../core/constants/chains'
import { CustomJsonRpcProvider } from '../core/utils/customJsonRpcProvider'
import { simulateTx } from './simulator/simulateTx'

export function simulateTxCommand(
  program: Command,
  chainProviders: Record<Chain, CustomJsonRpcProvider>,
) {
  program
    .command('simulate')
    .argument('[txHash]', 'Hash of the transaction')
    .argument('[chainId]', 'Chain ID of the transaction')
    .argument('[protocolTokenAddress]', 'Address of protocol token')
    .argument('[protocolId]', 'Protocol ID of protocol token')
    .argument('[productId]', 'Product ID of protocol token')
    .option(
      '-b, --block-number <block-number>',
      'Block number from which the provider will be forked',
    )
    .showHelpAfterError()
    .action(
      async (
        txHash,
        chainId,
        protocolTokenAddress,
        protocolId,
        productId,
        { blockNumber },
      ) => {
        const provider = chainProviders[chainId as Chain]
        await simulateTx({
          provider,
          chainId: Number(chainId) as Chain,
          input: txHash,
          protocolTokenAddress,
          protocolId,
          productId,
          blockNumber: Number(blockNumber),
        })
      },
    )
}
