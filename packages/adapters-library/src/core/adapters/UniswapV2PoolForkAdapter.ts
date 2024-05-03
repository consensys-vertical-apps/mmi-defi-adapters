import {
  UniswapV2Factory__factory,
  UniswapV2Pair__factory,
} from '../../contracts'
import {
  TokenBalance,
  TokenType,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { Chain } from '../constants/chains'
import { IMetadataBuilder } from '../decorators/cacheToFile'
import { filterMapAsync } from '../utils/filters'
import { getTokenMetadata } from '../utils/getTokenMetadata'
import { logger } from '../utils/logger'
import { SimplePoolAdapter } from './SimplePoolAdapter'

export type UniswapV2PoolForkAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    token0: Erc20Metadata
    token1: Erc20Metadata
  }
>

export type UniswapV2PoolForkMetadataBuilder =
  | {
      type: 'graphql'
      factoryAddress: string
      subgraphUrl: string
      subgraphQuery?: string
    }
  | { type: 'factory'; factoryAddress: string }

export abstract class UniswapV2PoolForkAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  protected readonly MAX_FACTORY_PAIRS: number = 1000
  protected readonly MIN_SUBGRAPH_VOLUME: number = 50000
  protected readonly MIN_TOKEN_RESERVE: number = 1

  protected readonly PROTOCOL_TOKEN_PREFIX_OVERRIDE:
    | { name: string; symbol: string }
    | undefined

  protected abstract chainMetadataSettings(): Partial<
    Record<Chain, UniswapV2PoolForkMetadataBuilder>
  >

  async buildMetadata(): Promise<UniswapV2PoolForkAdapterMetadata> {
    const factoryMetadata = this.chainMetadataSettings()[this.chainId]

    if (!factoryMetadata) {
      throw new Error('Chain not supported')
    }

    const pairs: {
      pairAddress: string
      token0Address: string
      token1Address: string
    }[] =
      factoryMetadata.type === 'graphql'
        ? await this.graphQlPoolExtraction(factoryMetadata)
        : await this.factoryPoolExtraction(factoryMetadata.factoryAddress)

    const [name, symbol] = this.PROTOCOL_TOKEN_PREFIX_OVERRIDE
      ? [
          this.PROTOCOL_TOKEN_PREFIX_OVERRIDE.name,
          this.PROTOCOL_TOKEN_PREFIX_OVERRIDE.symbol,
        ]
      : await this.fetchTokenPrefixFromPair(factoryMetadata.factoryAddress)

    const pairPromises = await Promise.allSettled(
      pairs.map(async (pair) => {
        const [protocolToken, token0, token1] = await Promise.all([
          getTokenMetadata(pair.pairAddress, this.chainId, this.provider),
          getTokenMetadata(pair.token0Address, this.chainId, this.provider),
          getTokenMetadata(pair.token1Address, this.chainId, this.provider),
        ])

        return {
          protocolToken: {
            ...protocolToken,
            name: `${name} ${token0.symbol} / ${token1.symbol}`,
            symbol: `${symbol}/${token0.symbol}/${token1.symbol}`,
          },
          token0,
          token1,
        }
      }),
    )

    return pairPromises.reduce((metadataObject, pair) => {
      if (pair.status === 'fulfilled') {
        metadataObject[pair.value.protocolToken.address] = pair.value
      }
      return metadataObject
    }, {} as UniswapV2PoolForkAdapterMetadata)
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
    blockNumber,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const protocolToken = await this.fetchProtocolTokenMetadata(
      protocolTokenBalance.address,
    )
    const pricesPerShare = await this.unwrapProtocolToken(
      protocolToken,
      blockNumber,
    )
    return pricesPerShare.map((underlyingPricePerShare) => {
      const balanceRaw =
        (protocolTokenBalance.balanceRaw *
          underlyingPricePerShare.underlyingRateRaw) /
        BigInt(10 ** protocolTokenBalance.decimals)

      return {
        address: underlyingPricePerShare.address,
        name: underlyingPricePerShare.name,
        symbol: underlyingPricePerShare.symbol,
        decimals: underlyingPricePerShare.decimals,
        type: TokenType.Underlying,
        balanceRaw,
      }
    })
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const { token0, token1 } = await this.fetchPoolMetadata(
      protocolTokenMetadata.address,
    )

    const pairContract = UniswapV2Pair__factory.connect(
      protocolTokenMetadata.address,
      this.provider,
    )

    const [protocolTokenSupply, [reserve0, reserve1]] = await Promise.all([
      pairContract.totalSupply({ blockTag: blockNumber }),
      pairContract.getReserves({ blockTag: blockNumber }),
    ])

    const [pricePerShare0, pricePerShare1] = [reserve0, reserve1].map(
      (reserve) =>
        // AssetReserve / ProtocolTokenSupply / 10 ** ProtocolTokenDecimals
        // Moved last division as multiplication at the top
        // Division sometimes is not exact, so it needs rounding
        BigInt(
          Math.round(
            (Number(reserve) * 10 ** protocolTokenMetadata.decimals) /
              Number(protocolTokenSupply),
          ),
        ),
    )

    return [
      {
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShare0!,
        ...token0,
      },
      {
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShare1!,
        ...token1,
      },
    ]
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { token0, token1 } =
      await this.fetchPoolMetadata(protocolTokenAddress)

    return [token0, token1]
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

  private async graphQlPoolExtraction({
    subgraphUrl,
    subgraphQuery,
  }: {
    subgraphUrl: string
    subgraphQuery?: string
  }): Promise<
    {
      pairAddress: string
      token0Address: string
      token1Address: string
    }[]
  > {
    // Volume and reserve filters have been added to avoid pairs that are not useful
    const response = await fetch(subgraphUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query:
          subgraphQuery ??
          `
          {
            pairs(
              first: ${this.MAX_FACTORY_PAIRS}
              where: {
                volumeUSD_gt: ${this.MIN_SUBGRAPH_VOLUME}
                reserve0_gte: ${this.MIN_TOKEN_RESERVE}
                reserve1_gte: ${this.MIN_TOKEN_RESERVE}
              }
              orderBy: reserveUSD orderDirection: desc
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
      }),
    })

    const gqlResponse: {
      data: {
        pairs: [
          {
            id: string
            token0: {
              id: string
            }
            token1: {
              id: string
            }
          },
        ]
      }
    } = await response.json()

    return gqlResponse.data.pairs.map((pair) => {
      return {
        pairAddress: pair.id,
        token0Address: pair.token0.id,
        token1Address: pair.token1.id,
      }
    })
  }

  private async factoryPoolExtraction(factoryAddress: string): Promise<
    {
      pairAddress: string
      token0Address: string
      token1Address: string
    }[]
  > {
    const factoryContract = UniswapV2Factory__factory.connect(
      factoryAddress,
      this.provider,
    )

    const allPairsLength = Number(await factoryContract.allPairsLength())

    return await filterMapAsync(
      [...Array(Math.min(allPairsLength, this.MAX_FACTORY_PAIRS)).keys()],
      async (_, index) => {
        const pairAddress = await factoryContract.allPairs(index)
        const pairContract = UniswapV2Pair__factory.connect(
          pairAddress,
          this.provider,
        )
        const [token0, token1, totalSupply] = await Promise.all([
          pairContract.token0(),
          pairContract.token1(),
          pairContract.totalSupply(),
        ])

        if (totalSupply > 0) {
          return {
            pairAddress,
            token0Address: token0,
            token1Address: token1,
          }
        }
      },
    )
  }

  private async fetchTokenPrefixFromPair(
    factoryAddress: string,
  ): Promise<[string, string]> {
    const factoryContract = UniswapV2Factory__factory.connect(
      factoryAddress,
      this.provider,
    )

    const firstPairAddress = await factoryContract.allPairs(0)
    const firstPairContract = UniswapV2Pair__factory.connect(
      firstPairAddress,
      this.provider,
    )

    return await Promise.all([
      firstPairContract.name(),
      firstPairContract.symbol(),
    ])
  }
}
