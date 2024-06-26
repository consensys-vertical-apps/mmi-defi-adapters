import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import {
  AssetType,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'
import { MorphoBasePoolAdapter } from '../../common/morphoBasePoolAdapter'

export class MorphoCompoundV2OptimizerBorrowAdapter extends MorphoBasePoolAdapter {
  productId = 'optimizer-borrow'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'MorphoCompoundV2',
      description: 'MorphoCompoundV2 defi adapter on the borrow side',
      siteUrl: 'https://compound.morpho.org/',
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
