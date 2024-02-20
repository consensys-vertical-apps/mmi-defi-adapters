import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
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
  GetTotalValueLockedInput,
  TokenBalance,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenTvl,
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
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata(): Promise<UniswapV2PoolAdapterMetadata> {
    const pools = [
      {
        id: '0x21b8065d10f73ee2e260e5b47d3344d3ced7596e',
        token0: '0x66a0f676479cee1d7373f3dc2e2952778bff5bd6',
        token1: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      },
      {
        id: '0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852',
        token0: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        token1: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      },
    ]

    const poolPromises = await Promise.all(
      pools.map(async (pool) => {
        const [protocolToken, token0, token1] = await Promise.all([
          getTokenMetadata(pool.id, this.chainId, this.provider),
          getTokenMetadata(pool.token0, this.chainId, this.provider),
          getTokenMetadata(pool.token1, this.chainId, this.provider),
        ])

        return {
          protocolToken,
          token0,
          token1,
        }
      }),
    )

    return poolPromises.reduce((metadataObject, pool) => {
      metadataObject[pool.protocolToken.address] = pool
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
    const prices = await this.getUnderlyingTokenConversionRate(
      protocolToken,
      blockNumber,
    )
    return prices.map((underlyingTokenPriceObject) => {
      const underlyingRateRawBigInt =
        underlyingTokenPriceObject.underlyingRateRaw
      const balanceRawBigInt = protocolTokenBalance.balanceRaw
      const decimalsBigInt = BigInt(10 ** protocolTokenBalance.decimals)
      const balanceRaw =
        (balanceRawBigInt * underlyingRateRawBigInt) / decimalsBigInt
      return {
        address: underlyingTokenPriceObject.address,
        name: underlyingTokenPriceObject.name,
        symbol: underlyingTokenPriceObject.symbol,
        decimals: underlyingTokenPriceObject.decimals,
        type: TokenType.Underlying,
        balanceRaw,
      }
    })
  }

  /**
   * Update me.
   * Below implementation might fit your metadata if not update it.
   */
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

    const [protocolTokenSupplyRaw, [reserve0, reserve1]] = await Promise.all([
      pairContract.totalSupply({ blockTag: blockNumber }),
      pairContract.getReserves({ blockTag: blockNumber }),
    ])

    console.log('RATE DETAILS', {
      protocolTokenSupplyRaw,
      decimals: protocolTokenMetadata.decimals,
      reserve0,
      reserve1,
    })

    // const protocolTokenSupply = BigInt(
    //   Number(protocolTokenSupplyRaw) / 10 ** protocolTokenMetadata.decimals,
    // )

    const [pricePerShare0, pricePerShare1] = [reserve0, reserve1].map(
      (reserve) => reserve / protocolTokenSupplyRaw,
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
}
