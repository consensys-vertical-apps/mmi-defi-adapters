import { CompoundV2SupplyMarketForkAdapter } from '../../../../core/adapters/CompoundV2SupplyMarketForkAdapter'
import { Chain } from '../../../../core/constants/chains'
import { TrustWalletProtocolIconMap } from '../../../../core/utils/buildIconUrl'
import {
  AdapterSettings,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'

import { Protocol } from '../../../protocols'

import { contractAddresses } from '../../common/contractAddresses'
import { CUSDCv3__factory } from '../../contracts'

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
      iconUrl: TrustWalletProtocolIconMap[Protocol.CompoundV2],
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }
}
