import { Command } from 'commander'
import { Chain, EvmChain } from '../core/constants/chains'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { chainFilter, protocolFilter } from './commandFilters'
import { simulateTx } from './simulator/simulateTx'

export function simulateTxCommand(
  program: Command,
  chainProviders: Record<EvmChain, CustomJsonRpcProvider>,
) {
  program
    .command('simulate')
    .argument('[txHash]', 'Hash of the transaction')
    .argument('[chain]', 'Chain ID of the transaction')
    .argument('[protocolTokenAddress]', 'Address of protocol token')
    .argument('[protocol]', 'Protocol ID of protocol token')
    .argument('[productId]', 'Product ID of protocol token')
    .option(
      '-b, --block-number <block-number>',
      'Block number from which the provider will be forked',
    )
    .showHelpAfterError()
    .action(
      async (
        txHash,
        chain,
        protocolTokenAddress,
        protocol,
        productId,
        { blockNumber },
      ) => {
        const protocolId = protocolFilter(protocol)
        const chainId = chainFilter(chain)

        if (!protocolId) {
          throw new Error('Protocol could not be parsed from input')
        }
        if (!chainId) {
          throw new Error('Chain could not be parsed from input')
        }
        if (chainId === Chain.Solana) {
          throw new Error('Solana is not supported')
        }

        const provider = chainProviders[chainId]
        await simulateTx({
          provider,
          chainId,
          input: txHash,
          protocolTokenAddress,
          protocolId,
          productId,
          blockNumber: Number(blockNumber) ? Number(blockNumber) : undefined,
        })
      },
    )
}
