import {
  UniswapV2PoolForkAdapter,
  UniswapV2PoolForkPositionStrategy,
} from '../../../../core/adapters/UniswapV2PoolForkAdapter'
import { Chain } from '../../../../core/constants/chains'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'

export class QuickswapV2PoolAdapter extends UniswapV2PoolForkAdapter {
  productId = 'pool'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'QuickswapV2',
      description: 'QuickswapV2 pool adapter',
      siteUrl: 'https://quickswap.exchange/#/pools/v2',
      iconUrl:
        'https://seeklogo.com/images/Q/quickswap-quick-logo-B9D689A214-seeklogo.com.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  protected chainMetadataSettings(): Partial<
    Record<Chain, UniswapV2PoolForkPositionStrategy>
  > {
    return {
      [Chain.Polygon]: {
        type: 'logs',
        factoryAddress: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
      },
    }
  }
}
