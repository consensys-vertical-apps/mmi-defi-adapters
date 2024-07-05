import {
  UniswapV2PoolForkAdapter,
  UniswapV2PoolForkPositionStrategy,
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
    Record<Chain, UniswapV2PoolForkPositionStrategy>
  > {
    return {
      [Chain.Ethereum]: {
        type: 'factory',
        factoryAddress: '0x1097053Fd2ea711dad45caCcc45EfF7548fCB362',
      },
      [Chain.Bsc]: {
        type: 'logs',
        factoryAddress: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
      },
      [Chain.Base]: {
        type: 'factory',
        factoryAddress: '0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E',
      },
      [Chain.Arbitrum]: {
        type: 'logs',
        factoryAddress: '0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E',
      },
      [Chain.Linea]: {
        type: 'factory',
        factoryAddress: '0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E',
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return super.buildMetadata()
  }
}
