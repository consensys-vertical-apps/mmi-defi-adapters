import { NewAdapterAnswers } from '../newAdapterCommand'

export function compoundV2BorrowMarketForkAdapterTemplate({
  protocolKey,
  adapterClassName,
  productId,
}: NewAdapterAnswers) {
  return `import { CompoundV2SupplyMarketForkAdapter } from '../../../../core/adapters/CompoundV2SupplyMarketForkAdapter'
  import { CacheToFile } from '../../../../core/decorators/cacheToFile'
  import {
    ProtocolDetails,
    PositionType,
    AssetType,
  } from '../../../../types/adapter'
  
  export class ${adapterClassName} extends CompoundV2SupplyMarketForkAdapter {
    productId = '${productId}'
  
    contractAddresses = {}
  
    getProtocolDetails(): ProtocolDetails {
      return {
        protocolId: this.protocolId,
        name: '${protocolKey}',
        description: '${protocolKey} borrow market adapter',
        siteUrl: 'https:',
        iconUrl: 'https://',
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
