import {
  type AdapterSettings,
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'
import { MorphoBasePoolAdapter } from '../../common/morphoBasePoolAdapter.js'

export class MorphoAaveV2OptimizerBorrowAdapter extends MorphoBasePoolAdapter {
  productId = 'optimizer-borrow'

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: false,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'MorphoAaveV2',
      description: 'MorphoAaveV2 defi adapter on the borrow side',
      siteUrl: 'https://aavev2.morpho.org/',
      iconUrl: 'https://cdn.morpho.org/images/v2/morpho/favicon.png',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      productId: this.productId,
    }
  }
}
