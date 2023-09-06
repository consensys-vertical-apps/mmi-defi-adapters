import { Protocol } from '../../..'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'
import { AaveV2BasePoolAdapter } from './aaveV2BasePoolAdapter'

export class AaveV2ATokenPoolAdapter extends AaveV2BasePoolAdapter {
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: Protocol.AaveV2,
      name: 'Aave v2 AToken',
      description: 'Aave v2 defi adapter for yield-generating token',
      siteUrl: 'https://aave.com/',
      iconUrl: 'https://aave.com/favicon.ico',
      positionType: PositionType.Supply,
      chainId: this.chainId,
    }
  }
}
