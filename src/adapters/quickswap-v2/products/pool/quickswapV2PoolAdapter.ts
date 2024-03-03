import {
  UniswapV2PoolForkAdapter,
  UniswapV2PoolForkMetadataBuilder,
} from '../../../../core/adapters/UniswapV2PoolForkAdapter'
import { Chain } from '../../../../core/constants/chains'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import {
  ProtocolDetails,
  PositionType,
  AssetType,
} from '../../../../types/adapter'

export class QuickswapV2PoolAdapter extends UniswapV2PoolForkAdapter {
  productId = 'pool'

  protected PROTOCOL_TOKEN_PREFIX_OVERRIDE = {
    name: 'Quickswap V2',
    symbol: 'QUICK',
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'QuickswapV2',
      description: 'QuickswapV2 pool adapter',
      siteUrl: 'https://v2.info.uniswap.org/home',
      iconUrl: 'https://cryptologos.cc/logos/uniswap-uni-logo.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  protected chainMetadataSettings(): Partial<
    Record<Chain, UniswapV2PoolForkMetadataBuilder>
  > {
    // TODO - For each supported chain, provide the settings needed to build the list of pools
    // If using subgraph (recommended for forks with an available subgraph), provide the subgraph URL and factory cotract address
    // If using factory contract (recommended when subgraph is no available), provide the factory contract address
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
