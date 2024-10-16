import {
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'
import { MorphoBasePoolAdapter } from '../../common/morphoBasePoolAdapter.js'

export class MorphoAaveV2OptimizerSupplyAdapter extends MorphoBasePoolAdapter {
  productId = 'optimizer-supply'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'MorphoAaveV2',
      description: 'MorphoAaveV2 defi adapter on the supply side',
      siteUrl: 'https://aavev2.morpho.org/',
      iconUrl: 'https://cdn.morpho.org/images/v2/morpho/favicon.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }
}
