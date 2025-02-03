import {
  UniswapV2PoolForkAdapter,
  UniswapV2PoolForkPositionStrategy,
} from '../../../../core/adapters/UniswapV2PoolForkAdapter'
import { Chain } from '../../../../core/constants/chains'
import {
  AdapterSettings,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'

export class LynexClassicAdapter extends UniswapV2PoolForkAdapter {
  productId = 'classic'

  adapterSettings: AdapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  protected PROTOCOL_TOKEN_PREFIX_OVERRIDE = {
    name: 'Lynex V2',
    symbol: 'LYNEX-V2',
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Lynex',
      description: 'Lynex classic pool adapter',
      siteUrl: 'https://app.lynex.fi/',
      iconUrl: 'https://app.lynex.fi/logo.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  protected chainMetadataSettings(): Partial<
    Record<Chain, UniswapV2PoolForkPositionStrategy>
  > {
    // TODO - For each supported chain, provide the settings needed to build the list of pools
    // If using subgraph (recommended for forks with an available subgraph), provide the subgraph URL and factory cotract address
    // If using factory contract (recommended when subgraph is no available), provide the factory contract address
    return {
      [Chain.Linea]: {
        type: 'graphql',
        subgraphUrl:
          'https://api.studio.thegraph.com/query/59052/lynex-v1/v0.1.0',
        factoryAddress: '0xBc7695Fd00E3b32D08124b7a4287493aEE99f9ee',
      },
    }
  }
}
