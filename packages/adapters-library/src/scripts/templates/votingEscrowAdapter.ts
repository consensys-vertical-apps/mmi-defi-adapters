import { Answers } from '../newAdapter2Command'

export function votingEscrowAdapterTemplate({
  protocolKey,
  adapterClassName,
  productId,
}: Pick<
  Answers,
  'protocolKey' | 'adapterClassName' | 'productId' | 'chainKeys'
>) {
  return `import { getAddress } from 'ethers'
  import { VotingEscrow } from '../../../../core/adapters/votingEscrow'
  import { NotImplementedError } from '../../../../core/errors/errors'
  import {
    ProtocolDetails,
    PositionType,
    AssetType,
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
        assetDetails: {
          type: AssetType.StandardErc20,
        },
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
