import { CompoundV2SupplyMarketForkAdapter } from '../../../../core/adapters/CompoundV2SupplyMarketForkAdapter.js'
import type { Chain } from '../../../../core/constants/chains.js'
import {
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'
import { contractAddresses } from '../../common/contractAddresses.js'

export class CompoundV2SupplyMarketAdapter extends CompoundV2SupplyMarketForkAdapter {
  productId = 'supply-market'

  contractAddresses: Partial<
    Record<Chain, { comptrollerAddress: string; cUSDCv3Address: string }>
  > = contractAddresses

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'CompoundV2',
      description: 'CompoundV2 supply market adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }
}
