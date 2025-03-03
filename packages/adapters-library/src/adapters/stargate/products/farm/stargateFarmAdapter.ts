import type { ProtocolAdapterParams } from '../../../../types/adapter.js'
import type { Erc20Metadata } from '../../../../types/erc20Metadata.js'
import { AbstractStargateFarmAdapter } from '../../common/abstractFarmAdapter.js'
import { staticChainData } from '../../common/staticChainData.js'

export type AdditionalMetadata = {
  poolIndex: number
  rewardToken: Erc20Metadata
  lpStakingType: 'LpStaking' | 'LpStakingTime'
  lpStakingAddress: string
}

export class StargateFarmAdapter extends AbstractStargateFarmAdapter {
  staticChainData

  constructor(input: ProtocolAdapterParams) {
    super(input)
    this.staticChainData = staticChainData[input.chainId]!
  }
}
