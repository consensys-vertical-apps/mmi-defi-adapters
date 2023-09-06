import { Protocol } from '../../..'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'
import { AaveV2BasePoolAdapter } from './aaveV2BasePoolAdapter'

export class AaveV2StableDebtTokenPoolAdapter extends AaveV2BasePoolAdapter {
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: Protocol.AaveV2,
      name: 'Aave v2 StableDebtToken',
      description: 'Aave v2 defi adapter for stable interest-accruing token',
      siteUrl: 'https://aave.com/',
      iconUrl: 'https://aave.com/favicon.ico',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
    }
  }
}
