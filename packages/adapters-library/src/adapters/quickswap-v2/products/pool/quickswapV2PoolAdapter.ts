import { UniswapV2Pair__factory } from '../../../../contracts'
import {
  UniswapV2PoolForkAdapter,
  UniswapV2PoolForkPositionStrategy,
} from '../../../../core/adapters/UniswapV2PoolForkAdapter'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'

export class QuickswapV2PoolAdapter extends UniswapV2PoolForkAdapter {
  productId = 'pool'

  protected PROTOCOL_TOKEN_PREFIX_OVERRIDE = {
    name: 'Quickswap V2',
    symbol: 'QUICK',
  }

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'QuickswapV2',
      description: 'QuickswapV2 pool adapter',
      siteUrl: 'https://quickswap.exchange/#/pools/v2',
      iconUrl:
        'https://seeklogo.com/images/Q/quickswap-quick-logo-B9D689A214-seeklogo.com.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  protected chainMetadataSettings(): Partial<
    Record<Chain, UniswapV2PoolForkPositionStrategy>
  > {
    return {
      [Chain.Polygon]: {
        type: 'graphql',
        subgraphUrl:
          'https://api.thegraph.com/subgraphs/name/sameepsi/quickswap06',
        factoryAddress: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
      },
    }
  }

  @CacheToDb()
  async getProtocolTokens() {
    const poolAddresses: string[] = []
    let nextPage: string | null =
      'https://app.geckoterminal.com/api/p1/polygon_pos/pools?dex=quickswap&dexes=quickswap&liquidity[gte]=50000&networks=polygon_pos&page=1&sort=-24h_volume'

    while (nextPage) {
      const result = (await fetch(nextPage).then((res) => res.json())) as {
        data: { type: string; attributes: { address: string } }[]
        links: { next: string | null }
      }

      poolAddresses.push(
        ...result.data
          .filter(({ type }) => type === 'pool')
          .map(({ attributes: { address } }) => address),
      )

      nextPage = result.links.next
    }

    const pairs: {
      pairAddress: string
      token0Address: string
      token1Address: string
    }[] = await Promise.all(
      poolAddresses.map(async (address) => {
        const pairContract = UniswapV2Pair__factory.connect(
          address,
          this.provider,
        )

        const [token0Address, token1Address] = await Promise.all([
          pairContract.token0(),
          pairContract.token1(),
        ])

        return {
          pairAddress: address,
          token0Address: token0Address,
          token1Address: token1Address,
        }
      }),
    )

    return this.processPairsWithQueue(pairs)
  }
}
