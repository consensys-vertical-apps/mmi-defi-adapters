import { CompoundV2BorrowMarketForkAdapter } from '../../../../core/adapters/CompoundV2BorrowMarketForkAdapter'
import { Chain } from '../../../../core/constants/chains'
import { TrustWalletProtocolIconMap } from '../../../../core/utils/buildIconUrl'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'
import { Protocol } from '../../../protocols'

import { contractAddresses } from '../../common/contractAddresses'

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
      iconUrl: TrustWalletProtocolIconMap[Protocol.CompoundV2],
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      productId: this.productId,
    }
  }
}
