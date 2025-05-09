import { CompoundV2BorrowMarketForkAdapter } from '../../../../core/adapters/CompoundV2BorrowMarketForkAdapter'
import { Chain } from '../../../../core/constants/chains'
import {
  AdapterSettings,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'

export class SonneBorrowMarketAdapter extends CompoundV2BorrowMarketForkAdapter {
  productId = 'borrow-market'

  contractAddresses: Partial<Record<Chain, { comptrollerAddress: string }>> = {
    [Chain.Optimism]: {
      comptrollerAddress: '0x60CF091cD3f50420d50fD7f707414d0DF4751C58',
    },
    [Chain.Base]: {
      comptrollerAddress: '0x1DB2466d9F5e10D7090E7152B68d62703a2245F0',
    },
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Sonne',
      description: 'Sonne borrow market adapter',
      siteUrl: 'https://sonne.finance/',
      iconUrl: 'https://sonne.finance/favicon.ico',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      productId: this.productId,
    }
  }
}
