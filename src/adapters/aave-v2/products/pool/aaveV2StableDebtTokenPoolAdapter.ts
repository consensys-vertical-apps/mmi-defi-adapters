import { Protocol } from '../../..'
import { Chain } from '../../../../core/constants/chains'
import {
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
} from '../../../../types/adapter'
import { AaveV2PoolMetadata } from '../../buildMetadata'
import { AaveV2BasePoolAdapter } from './aaveV2BasePoolAdapter'
import AVALANCHE_METADATA from './avalanche/stable-debt-token-pool-metadata.json'
import ETHEREUM_METADATA from './ethereum/stable-debt-token-pool-metadata.json'
import POLYGON_METADATA from './polygon/stable-debt-token-pool-metadata.json'

const Metadata: Partial<Record<Chain, AaveV2PoolMetadata>> = {
  [Chain.Ethereum]: ETHEREUM_METADATA,
  [Chain.Polygon]: POLYGON_METADATA,
  [Chain.Avalanche]: AVALANCHE_METADATA,
}

export class AaveV2StableDebtTokenPoolAdapter extends AaveV2BasePoolAdapter {
  constructor({ provider, chainId }: ProtocolAdapterParams) {
    super({
      provider,
      chainId,
      metadata: Metadata[chainId]!,
    })
  }

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
