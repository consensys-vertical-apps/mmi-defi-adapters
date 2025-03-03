import { CompoundV2SupplyMarketForkAdapter } from '../../../../core/adapters/CompoundV2SupplyMarketForkAdapter.js'
import {
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'
import { contractAddresses } from '../../common/contractAddresses.js'

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
