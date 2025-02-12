import { Command } from 'commander'

import { Chain, ChainIdToChainNameMap } from '../core/constants/chains'

import { DefiProvider } from '../defiProvider'
import { BlockIndexer } from './blockIndexer'
import Eth2StakingIndexer from './eth2Staking'

export function indexerEth2Staking(
  program: Command,
  defiProvider: DefiProvider,
) {
  program
    .command('indexer-eth2-staking-withdrawals')
    .showHelpAfterError()
    .action(async () => {
      const provider = defiProvider.chainProvider.providers[Chain.Ethereum]
      const eth2StakingIndexer = new Eth2StakingIndexer(provider)

      const indexer = new BlockIndexer({
        provider,
        chainId: Chain.Ethereum,
        chainName: ChainIdToChainNameMap[Chain.Ethereum],
        dbName: 'eth2_staking_indexer.db',
        startBlockOverride: eth2StakingIndexer.withdrawalsEnabledBlockNumber,
        additionalTablesToCreate: {
          eth2_staking: eth2StakingIndexer.createTableCommand,
        },
      })

      await indexer.processBlocks(
        eth2StakingIndexer.withdrawalsProcessBlock.bind(eth2StakingIndexer),
      )
    })
}
