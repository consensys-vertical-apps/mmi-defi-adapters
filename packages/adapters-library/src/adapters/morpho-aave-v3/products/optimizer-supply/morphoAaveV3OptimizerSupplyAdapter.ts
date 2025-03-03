import {
  type AdapterSettings,
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'
import { MorphoBasePoolAdapter } from '../../common/morphoBasePoolAdapter.js'

export class MorphoAaveV3OptimizerSupplyAdapter extends MorphoBasePoolAdapter {
  productId = 'optimizer-supply'
  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: false,
  }

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
    }
  }
}
