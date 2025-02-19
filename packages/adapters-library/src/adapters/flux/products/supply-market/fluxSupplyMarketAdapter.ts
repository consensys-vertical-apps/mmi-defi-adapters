import { CompoundV2SupplyMarketForkAdapter } from '../../../../core/adapters/CompoundV2SupplyMarketForkAdapter'
import {
  AdapterSettings,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'
import { contractAddresses } from '../../common/contractAddresses'

export class FluxSupplyMarketAdapter extends CompoundV2SupplyMarketForkAdapter {
  // Expected blocks per year
  static readonly EXPECTED_BLOCKS_PER_YEAR = 2628000

  productId = 'supply-market'

  contractAddresses = contractAddresses

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Flux',
      description: 'Flux supply market adapter',
      siteUrl: 'https://fluxfinance.com',
      iconUrl: 'https://docs.fluxfinance.com/img/favicon.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }
}
