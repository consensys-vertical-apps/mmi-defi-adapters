import {
  UniswapV2PoolForkAdapter,
  UniswapV2PoolForkPositionStrategy,
} from '../../../../core/adapters/UniswapV2PoolForkAdapter'
import { Chain } from '../../../../core/constants/chains'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'

export class LynexClassicAdapter extends UniswapV2PoolForkAdapter {
  productId = 'classic'

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
    return {
      [Chain.Linea]: {
        type: 'logs',
        factoryAddress: '0xBc7695Fd00E3b32D08124b7a4287493aEE99f9ee',
      },
    }
  }
}
