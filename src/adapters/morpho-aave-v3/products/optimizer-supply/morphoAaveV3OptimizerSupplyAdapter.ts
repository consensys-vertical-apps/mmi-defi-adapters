import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import {
  AssetType,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'
import { MorphoBasePoolAdapter } from '../../common/morphoBasePoolAdapter'

export class MorphoAaveV3EthOptimizerSupplyAdapter extends MorphoBasePoolAdapter {
  productId = 'optimizer-supply'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'MorphoAaveV3',
      description: 'MorphoAaveV3 DeFi adapter on the supply side',
      siteUrl: 'https://aavev3.morpho.org/',
      iconUrl: 'https://cdn.morpho.org/images/v2/morpho/favicon.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.NonStandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'optimizer-supply' })
  async buildMetadata() {
    return super.buildMetadata()
  }
}
