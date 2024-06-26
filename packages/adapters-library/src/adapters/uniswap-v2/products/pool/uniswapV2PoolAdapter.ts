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

export class UniswapV2PoolAdapter extends UniswapV2PoolForkAdapter {
  productId = 'pool'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
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
    Record<Chain, UniswapV2PoolForkMetadataBuilder>
  > {
    return {
      [Chain.Ethereum]: {
        type: 'graphql',
        subgraphUrl:
          'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v2-dev',
        factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
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
        type: 'factory',
        factoryAddress: '0x9e5A52f57b3038F1B8EeE45F28b3C1967e22799C',
      },
      [Chain.Base]: {
        type: 'factory',
        factoryAddress: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
      },
      [Chain.Arbitrum]: {
        type: 'factory',
        factoryAddress: '0xf1D7CC64Fb4452F05c498126312eBE29f30Fbcf9',
      },
      [Chain.Avalanche]: {
        type: 'factory',
        factoryAddress: '0x9e5A52f57b3038F1B8EeE45F28b3C1967e22799C',
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return super.buildMetadata()
  }
}
