import {
  UniswapV2PoolForkAdapter,
  UniswapV2PoolForkMetadataBuilder,
} from '../../../../core/adapters/UniswapV2PoolForkAdapter'
import { Chain } from '../../../../core/constants/chains'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import {
  AssetType,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'

export class QuickswapV2PoolAdapter extends UniswapV2PoolForkAdapter {
  productId = 'pool'

  protected PROTOCOL_TOKEN_PREFIX_OVERRIDE = {
    name: 'Quickswap V2',
    symbol: 'QUICK',
  }

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

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
    Record<Chain, UniswapV2PoolForkMetadataBuilder>
  > {
    return {
      [Chain.Polygon]: {
        type: 'graphql',
        subgraphUrl:
          'https://api.thegraph.com/subgraphs/name/sameepsi/quickswap06',
        factoryAddress: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return super.buildMetadata()
  }
}
