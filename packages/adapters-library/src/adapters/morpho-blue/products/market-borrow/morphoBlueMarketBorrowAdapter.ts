import {
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'
import { MorphoBluePoolAdapter } from '../../common/morphoBluePoolAdapter.js'

export class MorphoBlueMarketBorrowAdapter extends MorphoBluePoolAdapter {
  productId = 'market-borrow'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'MorphoBlue Borrow',
      description: 'Morpho Blue DeFi adapter on the borrow side',
      siteUrl: 'https://app.morpho.org/',
      iconUrl: 'https://cdn.morpho.org/images/v2/morpho/favicon.png',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      productId: this.productId,
    }
  }
}
