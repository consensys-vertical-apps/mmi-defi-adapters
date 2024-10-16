import {
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'
import { MorphoBluePoolAdapter } from '../../common/morphoBluePoolAdapter.js'

export class MorphoBlueMarketSupplyAdapter extends MorphoBluePoolAdapter {
  productId = 'market-supply'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'MorphoBlue Supply',
      description: 'Morpho Blue DeFi adapter on the supply side',
      siteUrl: 'https://app.morpho.org/',
      iconUrl: 'https://cdn.morpho.org/images/v2/morpho/favicon.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }
}
