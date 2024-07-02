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

export class SushiswapV2PoolAdapter extends UniswapV2PoolForkAdapter {
  productId = 'pool'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'SushiswapV2',
      description: 'SushiswapV2 pool adapter',
      siteUrl: 'https://www.sushi.com/pool',
      iconUrl: 'https://cryptologos.cc/logos/sushiswap-sushi-logo.svg',
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
          'https://api.thegraph.com/subgraphs/name/sushiswap/exchange',
        factoryAddress: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
      },
      [Chain.Bsc]: {
        type: 'graphql',
        subgraphUrl:
          'https://api.thegraph.com/subgraphs/name/sushiswap/bsc-exchange',
        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Polygon]: {
        type: 'graphql',
        subgraphUrl:
          'https://api.thegraph.com/subgraphs/name/sushiswap/matic-exchange',
        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Fantom]: {
        type: 'graphql',
        subgraphUrl:
          'https://api.thegraph.com/subgraphs/name/sushiswap/fantom-exchange',
        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Base]: {
        type: 'factory',
        factoryAddress: '0x71524B4f93c58fcbF659783284E38825f0622859',
      },
      [Chain.Arbitrum]: {
        type: 'graphql',
        subgraphUrl:
          'https://api.thegraph.com/subgraphs/name/sushiswap/arbitrum-exchange',
        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Avalanche]: {
        type: 'graphql',
        subgraphUrl:
          'https://api.thegraph.com/subgraphs/name/sushiswap/avalanche-exchange',
        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return super.buildMetadata()
  }
}
