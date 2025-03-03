import { CompoundV2BorrowMarketForkAdapter } from '../../../../core/adapters/CompoundV2BorrowMarketForkAdapter.js'
import type { Chain } from '../../../../core/constants/chains.js'
import {
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'

import { contractAddresses } from '../../common/contractAddresses.js'

export class CompoundV2BorrowMarketAdapter extends CompoundV2BorrowMarketForkAdapter {
  productId = 'borrow-market'

  contractAddresses: Partial<
    Record<Chain, { comptrollerAddress: string; cUSDCv3Address: string }>
  > = contractAddresses

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'CompoundV2',
      description: 'CompoundV2 borrow market adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      productId: this.productId,
    }
  }
}
