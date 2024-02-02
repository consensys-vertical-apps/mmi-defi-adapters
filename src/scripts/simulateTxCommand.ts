import { Command } from 'commander'
import { ethers } from 'ethers'
import { Chain } from '../core/constants/chains'
import { simulateTx } from './simulator/simulateTx'

export function simulateTxCommand(
  program: Command,
  chainProviders: Record<Chain, ethers.JsonRpcProvider>,
) {
  program
    .command('simulate')
    .argument('[txHash]', 'Hash of the transaction')
    .argument('[chainId]', 'Chain id of the transaction')
    .showHelpAfterError()
    .action(async (txHash, chainId) => {
      const provider = chainProviders[chainId as Chain]
      await simulateTx({ provider, input: txHash })
    })
}
