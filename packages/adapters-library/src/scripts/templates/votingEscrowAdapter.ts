import { Chain } from '../../core/constants/chains'
import { BlankAdapterOutcomeOptions, QuestionAnswers } from '../questionnaire'

export function votingEscrowAdapterTemplate({
  protocolKey,
  adapterClassName,
  productId,
}: {
  protocolKey: string
  adapterClassName: string
  productId: string
  chainKeys: (keyof typeof Chain)[]
}) {
  return `import { getAddress } from 'ethers'
  import { VotingEscrow } from '../../../../core/adapters/votingEscrow'
  import { NotImplementedError } from '../../../../core/errors/errors'
  import {
    ProtocolDetails,
    PositionType,
    GetPositionsInput,
  } from '../../../../types/adapter'
  
  export class ${adapterClassName} extends VotingEscrow {

    productId = '${productId}'

    getProtocolDetails(): ProtocolDetails {
      return {
        protocolId: this.protocolId,
        name: '${protocolKey}',
        description: '${protocolKey} defi adapter',
        siteUrl: '',
        iconUrl: '',
        positionType: PositionType.Staked,
        chainId: this.chainId,
        productId: this.productId,
      }
    }
  
    addresses = {
      veToken: "getAddress('0x...')",
      underlyingToken: "getAddress('0x...')",
      rewardToken: "getAddress('0x...')",
      feeDistributor: "getAddress('0x...')",
    }
  
    async getRewardBalance({
      userAddress,
      blockNumber,
    }: GetPositionsInput): Promise<bigint> {
      throw new NotImplementedError()
    }
  
    async getLockedDetails({
      userAddress,
      blockNumber,
    }: GetPositionsInput): Promise<{ amount: bigint; end: bigint }> {
      throw new NotImplementedError()
    }
  }
  `
}
