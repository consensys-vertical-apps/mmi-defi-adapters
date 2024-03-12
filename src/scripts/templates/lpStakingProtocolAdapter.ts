import { NewAdapterAnswers } from '../newAdapterCommand'

export function lpStakingAdapterTemplate({
  protocolKey,
  adapterClassName,
  productId,
}: NewAdapterAnswers) {
  return `import {
    LpStakingAdapter,
    LpStakingProtocolMetadata,
  } from '../../../../core/adapters/LpStakingProtocolAdapter'
  import {
    IMetadataBuilder,
    CacheToFile,
  } from '../../../../core/decorators/cacheToFile'
  import { NotImplementedError } from '../../../../core/errors/errors'
  import {
    ProtocolDetails,
    PositionType,
    AssetType,
    GetPositionsInputWithTokenAddresses,
    GetEventsInput,
    GetPositionsInput,
    MovementsByBlock,
    ProtocolPosition,
    GetAprInput,
    ProtocolTokenApr,
    GetApyInput,
    ProtocolTokenApy,
  } from '../../../../types/adapter'
  
  export class ${adapterClassName}
    extends LpStakingAdapter
    implements IMetadataBuilder
  {
    productId ='${productId}'
  
    getProtocolDetails(): ProtocolDetails {
      return {
        protocolId: this.protocolId,
        name: '${protocolKey}',
        description: '${protocolKey} pool adapter',
        siteUrl: 'https:',
        iconUrl: 'https://',
        positionType: PositionType.Supply,
        chainId: this.chainId,
        productId: this.productId,
        assetDetails: {
          type: AssetType.NonStandardErc20,
        },
      }
    }
    @CacheToFile({ fileKey: 'protocol-token' })
    async buildMetadata() {
      return {} as LpStakingProtocolMetadata
    }
  
    async getRewardPositions(_input: GetPositionsInputWithTokenAddresses): Promise<ProtocolPosition[]> {
      throw new NotImplementedError()
    }

    async getExtraRewardPositions(
      _input: GetPositionsInputWithTokenAddresses,
    ): Promise<ProtocolPosition[]> {
      throw new NotImplementedError()
    }
  
    async getRewardWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
      throw new NotImplementedError()
    }
  
    async getExtraRewardWithdrawals(
      _input: GetEventsInput,
    ): Promise<MovementsByBlock[]> {
      throw new NotImplementedError()
    }
  
    async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
      throw new NotImplementedError()
    }
  
    async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
      throw new NotImplementedError()
    }
  }
  `
}
