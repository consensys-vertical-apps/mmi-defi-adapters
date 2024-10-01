import {
  UniswapV2PoolForkAdapter,
  UniswapV2PoolForkPositionStrategy,
} from '../../../../core/adapters/UniswapV2PoolForkAdapter'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'

export class SushiswapV2PoolAdapter extends UniswapV2PoolForkAdapter {
  productId = 'pool'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  protected PROTOCOL_TOKEN_PREFIX_OVERRIDE = {
    name: 'Sushiswap V2',
    symbol: 'SUSHI-V2',
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
    Record<Chain, UniswapV2PoolForkPositionStrategy>
  > {
    return {
      [Chain.Ethereum]: {
        type: 'factory',

        factoryAddress: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
      },
      [Chain.Bsc]: {
        type: 'factory',

        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Polygon]: {
        type: 'factory',

        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Fantom]: {
        type: 'factory',

        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Base]: {
        type: 'factory',
        factoryAddress: '0x71524B4f93c58fcbF659783284E38825f0622859',
      },
      [Chain.Arbitrum]: {
        type: 'factory',

        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Avalanche]: {
        type: 'factory',

        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
    }
  }

  @CacheToDb()
  async getProtocolTokens() {
    return super.getProtocolTokens()
  }
}
