import {
  UniswapV2PoolForkAdapter,
  UniswapV2PoolForkPositionStrategy,
} from '../../../../core/adapters/UniswapV2PoolForkAdapter'
import { Chain } from '../../../../core/constants/chains'
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
        type: 'graphql',
        subgraphUrl:
          'https://gateway.thegraph.com/api/ef04394e9642f71e97006a384fe00ae4/subgraphs/id/6NUtT5mGjZ1tSshKLf5Q3uEEJtjBZJo1TpL5MXsUBqrT',
        factoryAddress: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
      },
      [Chain.Bsc]: {
        type: 'graphql',
        subgraphUrl:
          'https://gateway.thegraph.com/api/ef04394e9642f71e97006a384fe00ae4/subgraphs/id/GPRigpbNuPkxkwpSbDuYXbikodNJfurc1LCENLzboWer',
        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Polygon]: {
        type: 'graphql',
        subgraphUrl:
          'https://gateway.thegraph.com/api/ef04394e9642f71e97006a384fe00ae4/subgraphs/id/8NiXkxLRT3R22vpwLB4DXttpEf3X1LrKhe4T1tQ3jjbP',
        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Fantom]: {
        type: 'graphql',
        subgraphUrl:
          'https://gateway.thegraph.com/api/ef04394e9642f71e97006a384fe00ae4/subgraphs/id/3nozHyFKUhxnEvekFg5G57bxPC5V63eiWbwmgA35N5VK',
        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Base]: {
        type: 'factory',
        factoryAddress: '0x71524B4f93c58fcbF659783284E38825f0622859',
      },
      [Chain.Arbitrum]: {
        type: 'graphql',
        subgraphUrl:
          'https://gateway.thegraph.com/api/ef04394e9642f71e97006a384fe00ae4/subgraphs/id/8nFDCAhdnJQEhQF3ZRnfWkJ6FkRsfAiiVabVn4eGoAZH',
        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
      [Chain.Avalanche]: {
        type: 'graphql',
        subgraphUrl:
          'https://gateway.thegraph.com/api/ef04394e9642f71e97006a384fe00ae4/subgraphs/id/6VAhbtW5u2sPYkJKAcMsxgqTBu4a1rqmbiVQWgtNjrvT',
        factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      },
    }
  }
}
