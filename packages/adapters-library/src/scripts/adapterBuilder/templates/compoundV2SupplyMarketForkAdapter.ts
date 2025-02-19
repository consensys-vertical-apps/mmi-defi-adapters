export function compoundV2SupplyMarketForkAdapterTemplate({
  protocolKey,
  adapterClassName,
  productId,
}: {
  protocolKey: string
  adapterClassName: string
  productId: string
}) {
  return `
  import { CompoundV2SupplyMarketForkAdapter } from '../../../../core/adapters/CompoundV2SupplyMarketForkAdapter'
  import { Chain } from '../../../../core/constants/chains'
  import { PositionType, ProtocolDetails } from '../../../../types/adapter'
  
  export class ${adapterClassName} extends CompoundV2SupplyMarketForkAdapter {
    productId = '${productId}'
  
    contractAddresses: Partial<Record<Chain, { comptrollerAddress: string }>> = {}
  
    getProtocolDetails(): ProtocolDetails {
      return {
        protocolId: this.protocolId,
        name: '${protocolKey}',
        description: '${protocolKey} supply market adapter',
        siteUrl: '',
        iconUrl: '',
        positionType: PositionType.Supply,
        chainId: this.chainId,
        productId: this.productId,
      }
    }
  }
  `
}
