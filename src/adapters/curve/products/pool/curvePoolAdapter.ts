import { formatUnits } from 'ethers'
import { Erc20__factory } from '../../../../contracts'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { filterMapSync } from '../../../../core/utils/filters'
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
import { MetaRegistry__factory } from '../../contracts'

// Details https://github.com/curvefi/metaregistry
export const CURVE_META_REGISTRY_CONTRACT =
  '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC'

type CurvePoolAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
    poolAddress: string
  }
>

export class CurvePoolAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'pool'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Curve',
      description: 'Curve pool adapter',
      siteUrl: 'https://curve.fi/',
      iconUrl:
        'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/crv.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    const metaRegistryContract = MetaRegistry__factory.connect(
      CURVE_META_REGISTRY_CONTRACT,
      this.provider,
    )

    const metadataObject: CurvePoolAdapterMetadata = {}
    const poolCount = Number(await metaRegistryContract.pool_count())
    const poolDataPromises = Array.from({ length: poolCount }, (_, i) =>
      this.getPoolData(i),
    )
    const results = await Promise.all(poolDataPromises)

    filterMapSync(results, (token) => {
      if (!token) {
        return undefined
      }

      metadataObject[token.protocolToken.address.toLowerCase()] = {
        ...token,
        protocolToken: {
          ...token.protocolToken,
          address: token.protocolToken.address.toLowerCase(),
        },
      }
    })

    return metadataObject
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
   * Add logic to find tvl in a pool
   *
   */
  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  protected async getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    const { poolAddress, underlyingTokens, protocolToken } =
      await this.fetchPoolMetadata(protocolTokenMetadata.address)

    const metaRegistryContract = MetaRegistry__factory.connect(
      CURVE_META_REGISTRY_CONTRACT,
      this.provider,
    )

    if (
      this.chainId == Chain.Ethereum &&
      blockNumber &&
      blockNumber < 15732062
    ) {
      throw new Error('Curve meta registry not deployed at this block number')
    }

    const balances = await metaRegistryContract['get_balances(address)'](
      poolAddress,
      { blockTag: blockNumber },
    )

    const lpTokenContract = Erc20__factory.connect(
      protocolToken.address,
      this.provider,
    )

    const supply = await lpTokenContract.totalSupply({ blockTag: blockNumber })

    // note balances array not same size as underlying array, might be a vyper: no dynamic array limitation
    return underlyingTokens.map((underlyingToken, index) => {
      const balance = balances[index]!

      const underlyingRateRaw =
        balance / (supply / 10n ** BigInt(protocolToken.decimals))

      return {
        type: TokenType.Underlying,
        underlyingRateRaw,
        ...underlyingToken,
      }
    })
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
    const { underlyingTokens } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    return underlyingTokens
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

  private async getPoolData(i: number): Promise<
    | {
        protocolToken: Erc20Metadata
        underlyingTokens: Erc20Metadata[]
        poolAddress: string
      }
    | undefined
  > {
    const metaRegistryContract = MetaRegistry__factory.connect(
      CURVE_META_REGISTRY_CONTRACT,
      this.provider,
    )
    const poolAddress = await metaRegistryContract.pool_list(i)
    const lpToken = await metaRegistryContract['get_lp_token(address)'](
      poolAddress,
    )
    const lpTokenContract = Erc20__factory.connect(lpToken, this.provider)

    const underlyingCoins = (
      await metaRegistryContract['get_underlying_coins(address)'](poolAddress)
    ).filter((address) => address !== ZERO_ADDRESS)

    const [
      { name: poolName, decimals: poolDecimals, symbol: poolSymbol },
      totalSupply,
    ] = await Promise.all([
      getTokenMetadata(lpToken, this.chainId, this.provider),
      lpTokenContract.totalSupply(),
    ])

    const totalSupplyFormatted = Number(formatUnits(totalSupply, poolDecimals))

    if (+totalSupplyFormatted < 1) {
      return undefined
    }

    const underlyingTokens = await Promise.all(
      underlyingCoins.map((result) =>
        getTokenMetadata(result, Chain.Ethereum, this.provider),
      ),
    )

    return {
      protocolToken: {
        name: poolName,
        decimals: Number(poolDecimals),
        symbol: poolSymbol,
        address: lpToken,
      },
      underlyingTokens,
      poolAddress: poolAddress,
    }
  }
}
