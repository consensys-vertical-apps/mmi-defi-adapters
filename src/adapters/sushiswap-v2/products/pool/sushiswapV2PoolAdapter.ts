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

export class SushiswapV2PoolAdapter extends UniswapV2PoolForkAdapter {
  productId = 'pool'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'SushiswapV2',
      description: 'SushiswapV2 defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.NonStandardErc20,
      },
    }
  }

  protected chainMetadataSettings(): Partial<
    Record<Chain, UniswapV2PoolForkMetadataBuilder>
  > {
    const query = `{ pairs(first: 1000 where: {volumeUSD_gt: 50000} orderBy: reserveUSD orderDirection: desc) {id token0 {id} token1 {id}}}`
    return {
      [Chain.Ethereum]: {
        type: 'graphql',
        url: 'https://api.thegraph.com/subgraphs/name/sushiswap/exchange',
        query,
        factoryAddress: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
      },
      [Chain.Bsc]: {
        type: 'graphql',
        url: 'https://api.thegraph.com/subgraphs/name/sushiswap/bsc-exchange',
        query,
        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Polygon]: {
        type: 'graphql',
        url: 'https://api.thegraph.com/subgraphs/name/sushiswap/matic-exchange',
        query,
        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Fantom]: {
        type: 'graphql',
        url: 'https://api.thegraph.com/subgraphs/name/sushiswap/fantom-exchange',
        query,
        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Base]: {
        type: 'factory',
        factoryAddress: '0x71524B4f93c58fcbF659783284E38825f0622859',
      },
      [Chain.Arbitrum]: {
        type: 'graphql',
        url: 'https://api.thegraph.com/subgraphs/name/sushiswap/arbitrum-exchange',
        query,
        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Avalanche]: {
        type: 'graphql',
        url: 'https://api.thegraph.com/subgraphs/name/sushiswap/avalanche-exchange',
        query,
        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return super.buildMetadata()
  }
}
