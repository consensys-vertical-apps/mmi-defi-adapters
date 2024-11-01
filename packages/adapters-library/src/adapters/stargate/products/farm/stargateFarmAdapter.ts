import { ProtocolAdapterParams } from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { AbstractStargateFarmAdapter } from '../../common/abstractFarmAdapter'
import { staticChainData } from '../../common/staticChainData'

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
