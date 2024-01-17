import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'
import { MorphoBluePoolAdapter } from '../../common/morphoBluePoolAdapter'

export class MorphoBlueSupplyAdapter extends MorphoBluePoolAdapter {
  productId = 'supply'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'MorphoBlue',
      description: 'MorphoBlue defi adapter',
      siteUrl: 'https://app.morpho.org/',
      iconUrl: 'https://cdn.morpho.org/images/v2/morpho/favicon.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'supply' })
  async buildMetadata() {
    return super.buildMetadata()
  }
}
