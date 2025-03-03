import { CompoundV2BorrowMarketForkAdapter } from '../../../../core/adapters/CompoundV2BorrowMarketForkAdapter.js'
import type { Chain } from '../../../../core/constants/chains.js'
import {
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'
import { contractAddresses } from '../supply-market/mendiFinanceSupplyMarketAdapter.js'

export class MendiFinanceBorrowMarketAdapter extends CompoundV2BorrowMarketForkAdapter {
  productId = 'borrow-market'

  contractAddresses: Partial<
    Record<Chain, { comptrollerAddress: string; cUSDCv3Address: string }>
  > = contractAddresses

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'MendiFinance',
      description: 'MendiFinance borrow adapter',
      siteUrl: 'https://mendi.finance/:',
      iconUrl: 'https://mendi.finance/mendi-token.svg',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      productId: this.productId,
    }
  }
}
