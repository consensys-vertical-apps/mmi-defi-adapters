import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'
import { MorphoBluePoolAdapter } from '../../common/morphoBluePoolAdapter'

export class MorphoBlueBorrowAdapter extends MorphoBluePoolAdapter {
  productId = 'borrow'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'MorphoBlue',
      description: 'MorphoBlue defi adapter',
      siteUrl: 'https://app.morpho.org/',
      iconUrl: 'https://cdn.morpho.org/images/v2/morpho/favicon.png',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'borrow' })
  async buildMetadata() {
    return super.buildMetadata()
  }
}
