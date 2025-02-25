import {
  AdapterSettings,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'
import { MorphoBluePoolAdapter } from '../../common/morphoBluePoolAdapter'

export class MorphoBlueMarketSupplyAdapter extends MorphoBluePoolAdapter {
  productId = 'market-supply'

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: {
      topic0:
        '0xedf8870433c83823eb071d3df1caa8d008f12f6440918c20d75a3602cda30fe0',
      userAddressIndex: 3,
      eventContract: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
      filter: ['#tokenId', null, null],
    },
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
