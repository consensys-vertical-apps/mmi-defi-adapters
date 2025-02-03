import {
  AdapterSettings,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'
import { MorphoBluePoolAdapter } from '../../common/morphoBluePoolAdapter'

export class MorphoBlueMarketBorrowAdapter extends MorphoBluePoolAdapter {
  productId = 'market-borrow'

  adapterSettings: AdapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
    userEvent: false,
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
