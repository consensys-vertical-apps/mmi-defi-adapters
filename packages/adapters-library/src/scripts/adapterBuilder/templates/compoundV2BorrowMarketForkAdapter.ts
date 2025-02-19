export function compoundV2BorrowMarketForkAdapterTemplate({
  protocolKey,
  adapterClassName,
  productId,
}: {
  protocolKey: string
  adapterClassName: string
  productId: string
}) {
  return `
  import { CompoundV2BorrowMarketForkAdapter } from '../../../../core/adapters/CompoundV2BorrowMarketForkAdapter'
  import { Chain } from '../../../../core/constants/chains'
  import { PositionType, ProtocolDetails } from '../../../../types/adapter'
  
  export class ${adapterClassName} extends CompoundV2BorrowMarketForkAdapter {
    productId = '${productId}'
  
    contractAddresses: Partial<Record<Chain, { comptrollerAddress: string }>> = {}
  
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
      }
    }
  `
}
