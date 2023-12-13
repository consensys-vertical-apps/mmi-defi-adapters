import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'
import { MorphoBasePoolAdapter } from '../../common/morphoBasePoolAdapter'

export class MorphoAaveV3ETHOptimizerBorrowAdapter extends MorphoBasePoolAdapter {
  productId = 'optimizer-borrow'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'MorphoAaveV3',
      description: 'MorphoAaveV3 DeFi adapter on the borrow side',
      siteUrl: 'https://aavev3.morpho.org/',
      iconUrl: 'https://cdn.morpho.org/images/v2/morpho/favicon.png',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'optimizer-borrow' })
  async buildMetadata() {
    return super.buildMetadata()
  }
}
