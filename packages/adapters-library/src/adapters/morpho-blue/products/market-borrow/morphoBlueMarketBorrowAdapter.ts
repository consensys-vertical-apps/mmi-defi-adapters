import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import {
  AssetType,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'
import { MorphoBluePoolAdapter } from '../../common/morphoBluePoolAdapter'

export class MorphoBlueMarketBorrowAdapter extends MorphoBluePoolAdapter {
  productId = 'market-borrow'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'MorphoBlue',
      description: 'Morpho Blue DeFi adapter on the borrow side',
      siteUrl: 'https://app.morpho.org/',
      iconUrl: 'https://cdn.morpho.org/images/v2/morpho/favicon.png',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      productId: this.productId,
      adapterSettings: {
        enablePositionDetectionByProtocolTokenTransfer: false,
        includeInUnwrap: false,
      },
    }
  }

  @CacheToFile({ fileKey: 'market-borrow' })
  async buildMetadata() {
    return super.buildMetadata()
  }
}
