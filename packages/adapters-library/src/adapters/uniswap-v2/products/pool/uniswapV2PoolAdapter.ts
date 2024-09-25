import {
  UniswapV2PoolForkAdapter,
  UniswapV2PoolForkPositionStrategy,
} from '../../../../core/adapters/UniswapV2PoolForkAdapter'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'

export class UniswapV2PoolAdapter extends UniswapV2PoolForkAdapter {
  productId = 'pool'

  protected PROTOCOL_TOKEN_PREFIX_OVERRIDE = {
    name: 'Uniswap V2',
    symbol: 'UNI-V2',
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'UniswapV2',
      description: 'UniswapV2 pool adapter',
      siteUrl: 'https://v2.info.uniswap.org/home',
      iconUrl: 'https://cryptologos.cc/logos/uniswap-uni-logo.svg',
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
        factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        type: 'graphql',
        subgraphUrl:
          'https://gateway.thegraph.com/api/ef04394e9642f71e97006a384fe00ae4/subgraphs/id/EYCKATKGBKLWvSfwvBjzfCBmGwYNdVkduYXVivCsLRFu',
      },
      [Chain.Optimism]: {
        type: 'factory',
        factoryAddress: '0x0c3c1c532F1e39EdF36BE9Fe0bE1410313E074Bf',
      },
      [Chain.Bsc]: {
        type: 'factory',
        factoryAddress: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
      },
      [Chain.Polygon]: {
        type: 'graphql',
        subgraphUrl:
          'https://gateway.thegraph.com/api/ef04394e9642f71e97006a384fe00ae4/subgraphs/id/EXBcAqmvQi6VAnE9X4MNK83LPeA6c1PsGskffbmThoeK',
        factoryAddress: '0x9e5A52f57b3038F1B8EeE45F28b3C1967e22799C',
      },
      [Chain.Base]: {
        type: 'factory',
        factoryAddress: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
      },
      [Chain.Arbitrum]: {
        type: 'graphql',
        subgraphUrl:
          'https://gateway.thegraph.com/api/ef04394e9642f71e97006a384fe00ae4/subgraphs/id/CStW6CSQbHoXsgKuVCrk3uShGA4JX3CAzzv2x9zaGf8w',
        factoryAddress: '0xf1D7CC64Fb4452F05c498126312eBE29f30Fbcf9',
      },
      [Chain.Avalanche]: {
        type: 'factory',
        factoryAddress: '0x9e5A52f57b3038F1B8EeE45F28b3C1967e22799C',
      },
    }
  }

  @CacheToDb()
  async getProtocolTokens() {
    return super.getProtocolTokens()
  }
}
