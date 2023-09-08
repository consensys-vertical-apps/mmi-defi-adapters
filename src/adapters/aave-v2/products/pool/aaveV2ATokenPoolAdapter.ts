import { Protocol } from '../../..'
import {
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
} from '../../../../types/adapter'
import { fetchAaveV2ATokenMetadata } from '../../aaveV2MetadataFetcher'
import { AaveV2BasePoolAdapter } from './aaveV2BasePoolAdapter'

export class AaveV2ATokenPoolAdapter extends AaveV2BasePoolAdapter {
  constructor({ provider, chainId }: ProtocolAdapterParams) {
    super({
      provider,
      chainId,
      metadata: fetchAaveV2ATokenMetadata(chainId),
    })
  }

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
