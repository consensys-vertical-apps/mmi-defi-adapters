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

export class PancakeswapV2PoolAdapter extends UniswapV2PoolForkAdapter {
  productId = 'pool'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'PancakeswapV2',
      description: 'PancakeswapV2 pool adapter',
      siteUrl: 'https://pancakeswap.finance/pools',
      iconUrl: 'https://cryptologos.cc/logos/pancakeswap-cake-logo.svg?v=029',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  protected chainMetadataSettings(): Partial<
    Record<Chain, UniswapV2PoolForkMetadataBuilder>
  > {
    return {
      [Chain.Ethereum]: {
        type: 'graphql',
        factoryAddress: '0x1097053Fd2ea711dad45caCcc45EfF7548fCB362',
        subgraphUrl:
          'https://api.thegraph.com/subgraphs/name/pancakeswap/exhange-eth',
      },
      [Chain.Bsc]: {
        type: 'graphql',
        factoryAddress: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
        subgraphUrl:
          'https://data-platform.nodereal.io/graph/v1/b4355ec60e4c4d85a3d3204386a8c5ed/projects/pancakeswap',
        subgraphQuery: `
          {
            pairs(
              first: ${this.MAX_FACTORY_PAIRS}
              orderBy: trackedReserveBNB orderDirection: desc
            )
            {
              id
              token0 {
                id
              }
              token1 {
                id
              }
            }
          }`,
      },
      [Chain.Base]: {
        type: 'graphql',
        factoryAddress: '0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E',
        subgraphUrl:
          'https://api.studio.thegraph.com/query/45376/exchange-v2-base/version/latest',
      },
      [Chain.Arbitrum]: {
        factoryAddress: '0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E',
        type: 'factory',
      },
      [Chain.Linea]: {
        type: 'graphql',
        factoryAddress: '0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E',
        subgraphUrl:
          'https://graph-query.linea.build/subgraphs/name/pancakeswap/exhange-v2',
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return super.buildMetadata()
  }
}
