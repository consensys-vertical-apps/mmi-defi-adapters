import { Command } from 'commander'
import { Protocol } from '../adapters/protocols'
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
    .option(
      '-b, --block-number <block-number>',
      'Block number from which the provider will be forked',
    )
    .showHelpAfterError()
    .action(async (txHash, chainId, { blockNumber }) => {
      const provider = chainProviders[chainId as Chain]
      await simulateTx({
        provider,
        chainId: Number(chainId) as Chain,
        input: txHash,
        protocolTokenAddress: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
        protocolId: Protocol.AaveV3,
        productId: 'a-token',
        blockNumber: Number(blockNumber),
      })
    })
}
