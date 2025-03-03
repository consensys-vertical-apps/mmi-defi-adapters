import {
  UniswapV2PoolForkAdapter,
  type UniswapV2PoolForkPositionStrategy,
} from '../../../../core/adapters/UniswapV2PoolForkAdapter.js'
import { Chain } from '../../../../core/constants/chains.js'
import {
  type AdapterSettings,
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'

export class PancakeswapV2PoolAdapter extends UniswapV2PoolForkAdapter {
  productId = 'pool'

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  protected PROTOCOL_TOKEN_PREFIX_OVERRIDE = {
    name: 'Pancake LPs',
    symbol: 'Cake-LP',
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
    Record<Chain, UniswapV2PoolForkPositionStrategy>
  > {
    return {
      [Chain.Ethereum]: {
        type: 'factory',
        factoryAddress: '0x1097053Fd2ea711dad45caCcc45EfF7548fCB362',
      },
      [Chain.Bsc]: {
        type: 'graphql',
        factoryAddress: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
        subgraphUrl:
          'https://data-platform.nodereal.io/graph/v1/b4355ec60e4c4d85a3d3204386a8c5ed/projects/pancakeswap',
        subgraphQuery: (BATCH_SIZE, skip) => `
          {
            pairs(
              first: ${BATCH_SIZE}
              skip: ${skip}
              orderBy: trackedReserveBNB
              orderDirection: desc
            ) {
              id
              token0 {
                id
              }
              token1 {
                id
              }
              trackedReserveBNB
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
}
