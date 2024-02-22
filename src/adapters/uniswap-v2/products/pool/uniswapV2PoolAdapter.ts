import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import {
  ProtocolDetails,
  PositionType,
  GetAprInput,
  GetApyInput,
  TokenBalance,
  ProtocolTokenApr,
  ProtocolTokenApy,
  UnderlyingTokenRate,
  Underlying,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Pair__factory } from '../../contracts'

type UniswapV2PoolAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    token0: Erc20Metadata
    token1: Erc20Metadata
  }
>

type GqlResponse = {
  data: {
    pairs: [
      {
        id: string
        token0: {
          id: string
          symbol: string
          name: string
          decimals: number
        }
        token1: {
          id: string
          symbol: string
          name: string
          decimals: number
        }
      },
    ]
  }
}

export class UniswapV2PoolAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'pool'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'UniswapV2',
      description: 'UniswapV2 pool adapter',
      siteUrl: 'https://v2.info.uniswap.org/home',
      iconUrl: 'https://app.uniswap.org/swap',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata(): Promise<UniswapV2PoolAdapterMetadata> {
    const numberOfPairs = 1000
    const minVolumeUSD = 50000
    const graphQueryUrl: Partial<Record<Chain, string>> = {
      [Chain.Ethereum]:
        'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v2-dev',
    }

    const response = await fetch(graphQueryUrl[this.chainId]!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{ pairs(first: ${numberOfPairs} where: {volumeUSD_gt: ${minVolumeUSD}} orderBy: reserveUSD orderDirection: desc) {id token0 {id} token1 {id}}}`,
      }),
    })

    const gqlResponse: GqlResponse = await response.json()

    const pairPromises = await Promise.all(
      gqlResponse.data.pairs.map(async (pair) => {
        const [protocolToken, token0, token1] = await Promise.all([
          getTokenMetadata(pair.id, this.chainId, this.provider),
          getTokenMetadata(pair.token0.id, this.chainId, this.provider),
          getTokenMetadata(pair.token1.id, this.chainId, this.provider),
        ])

        return {
          protocolToken: {
            ...protocolToken,
            name: this.protocolTokenName(token0.symbol, token1.symbol),
            symbol: this.protocolTokenSymbol(token0.symbol, token1.symbol),
          },
          token0,
          token1,
        }
      }),
    )

    return pairPromises.reduce((metadataObject, pair) => {
      metadataObject[pair.protocolToken.address] = pair
      return metadataObject
    }, {} as UniswapV2PoolAdapterMetadata)
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
    const pricesPerShare = await this.getUnderlyingTokenConversionRate(
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

  protected async getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    const { token0, token1 } = await this.fetchPoolMetadata(
      protocolTokenMetadata.address,
    )

    const pairContract = Pair__factory.connect(
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

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { token0, token1 } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

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

  private protocolTokenName(token0Symbol: string, token1Symbol: string) {
    return `Uniswap V2 ${token0Symbol} / ${token1Symbol}`
  }

  private protocolTokenSymbol(token0Symbol: string, token1Symbol: string) {
    return `UNI-V2/${token0Symbol}/${token1Symbol}`
  }
}
