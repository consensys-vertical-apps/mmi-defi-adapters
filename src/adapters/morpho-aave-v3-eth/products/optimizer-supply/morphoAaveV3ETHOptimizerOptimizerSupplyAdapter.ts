import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'
import { MorphoBasePoolAdapter } from '../../common/morphoBasePoolAdapter'

export class MorphoAaveV3ETHOptimizerOptimizerSupplyAdapter extends MorphoBasePoolAdapter {
  productId = 'optimizer-supply'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'MorphoAaveV3',
      description: 'MorphoAaveV3 defi adapter on the supply side',
      siteUrl: 'https://aavev3.morpho.org/',
      iconUrl: 'https://cdn.morpho.org/images/v2/morpho/favicon.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'optimizer-supply' })
  async buildMetadata() {
    return super.buildMetadata()
  }
}
