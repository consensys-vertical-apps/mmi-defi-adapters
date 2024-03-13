import { NewAdapterAnswers } from '../newAdapterCommand'

export function compoundV2BorrowMarketForkAdapterTemplate({
  protocolKey,
  adapterClassName,
  productId,
}: NewAdapterAnswers) {
  return `import { CompoundV2BorrowMarketForkAdapter } from '../../../../core/adapters/CompoundV2BorrowMarketForkAdapter'
  import { CacheToFile } from '../../../../core/decorators/cacheToFile'
  import {
    ProtocolDetails,
    PositionType,
    AssetType,
  } from '../../../../types/adapter'
  
  export class ${adapterClassName} extends CompoundV2BorrowMarketForkAdapter {
    productId = '${productId}'
  
    contractAddresses = {}
  
    getProtocolDetails(): ProtocolDetails {
      return {
        protocolId: this.protocolId,
        name: '${protocolKey}',
        description: '${protocolKey} borrow market adapter',
        siteUrl: '',
        iconUrl: '',
        positionType: PositionType.Borrow,
        chainId: this.chainId,
        productId: this.productId,
        assetDetails: {
          type: AssetType.NonStandardErc20,
        },
      }
    }
  
    @CacheToFile({ fileKey: 'protocol-token' })
    async buildMetadata() {
      return await super.buildMetadata()
    }
  }
  `
}
