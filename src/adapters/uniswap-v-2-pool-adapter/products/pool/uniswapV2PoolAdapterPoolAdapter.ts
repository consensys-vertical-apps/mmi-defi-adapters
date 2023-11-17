import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
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
  GetEventsInput,
  MovementsByBlock,
  GetAprInput,
  GetApyInput,
  GetTotalValueLockedInput,
  TokenBalance,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenTvl,
  UnderlyingTokenRate,
  Underlying,
  ProtocolRewardPosition,
  GetClaimableRewardsInput,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { UniswapV2Factory__factory, UniswapV2Pair__factory, UniswapV2Router02__factory } from '../../contracts'

export const UNISWAP_V2_FACTORY_CONTRACT = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
export const UNISWAP_V2_ROUTER02_CONTRACT = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'

type UniswapV2PoolAdapterMetadata = Record<string, { protocolToken: Erc20Metadata, underlyingTokens: Erc20Metadata[], poolAddress: string }>

export class UniswapV2PoolAdapterPoolAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder {
  productId = 'pool'

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'UniswapV2PoolAdapter',
      description: 'UniswapV2PoolAdapter pool adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' }) async buildMetadata() {

    console.log('Running')
    const factoryContract = UniswapV2Factory__factory.connect(UNISWAP_V2_FACTORY_CONTRACT, this.provider,)
    const metadataObject: UniswapV2PoolAdapterMetadata = {}
    const allPairsLength = 11 ?? Number(await factoryContract.allPairsLength())
    const pairAddresses = await Promise.all(Array.from({ length: allPairsLength }, (_, i) => factoryContract.allPairs(i)))
    const poolDataPromises = pairAddresses.map(async (pairAddress) => {
      const pairContract = UniswapV2Pair__factory.connect(pairAddress, this.provider)
      const token0Address = await pairContract.token0()
      const token1Address = await pairContract.token1()
      const token0Metadata = await getTokenMetadata(token0Address, this.chainId, this.provider)
      const token1Metadata = await getTokenMetadata(token1Address, this.chainId, this.provider)
      const reserves = await pairContract.getReserves()
      const totalSupply = await pairContract.totalSupply()
      // const sqrtPriceX96 = await pairContract.slot0()
      // const price = sqrtPriceX96.sqrtX96.toString()
      const poolAddress = pairAddress
      return {
        protocolToken: {
          name: `${token0Metadata.symbol}-${token1Metadata.symbol} Uniswap V2 LP Token`,
          symbol: `${token0Metadata.symbol}-${token1Metadata.symbol} Uniswap V2`,
          decimals: 18,
          address: poolAddress,
        },
        underlyingTokens: [token0Metadata, token1Metadata],
        poolAddress,
      }
    })
    const results = await Promise.all(poolDataPromises)
    filterMapSync(results, (token) => {
      if (!token) {
        return undefined
      }
      metadataObject[token.protocolToken.address] = token
    })
    return metadataObject
  }
  /**
   * Update me.
   * Below implementation might fit your metadata if not update it.
   */
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  protected async getUnderlyingTokenBalances({ protocolTokenBalance, blockNumber, }: { userAddress: string, protocolTokenBalance: TokenBalance, blockNumber?: number }): Promise<Underlying[]> {

    console.log('getUnderlyingTokenBalances')
    const protocolToken = await this.fetchProtocolTokenMetadata(protocolTokenBalance.address,)
    const prices = await this.getUnderlyingTokenConversionRate(protocolToken, blockNumber,)
    const result = prices.map((underlyingTokenPriceObject) => {
      const underlyingRateRawBigInt = underlyingTokenPriceObject.underlyingRateRaw
      const balanceRawBigInt = protocolTokenBalance.balanceRaw
      const decimalsBigInt = BigInt(10 ** protocolTokenBalance.decimals)
      const balanceRaw = (balanceRawBigInt * underlyingRateRawBigInt) / decimalsBigInt
      return {
        address: underlyingTokenPriceObject.address,
        name: underlyingTokenPriceObject.name,
        symbol: underlyingTokenPriceObject.symbol,
        decimals: underlyingTokenPriceObject.decimals,
        type: TokenType.Underlying,
        balanceRaw,
      }
    })

    console.log({ result })

    return result
  }

  /**
   * Update me.
   * Add logic to return current claimable rewards.
   * Ensure you support blocknumber override param
   *
   */
  async getClaimableRewards(
    _input: GetClaimableRewardsInput,
  ): Promise<ProtocolRewardPosition[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to return claimed rewards between blocknumber range
   * Implement as you wish, use event logs or chain data if possible
   *
   */
  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
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

  /**
   * Update me.
   * Add logic that finds the underlying token rates for 1 protocol token
   */
  protected async getUnderlyingTokenConversionRate(protocolTokenMetadata: Erc20Metadata, blockNumber: number | undefined,): Promise<UnderlyingTokenRate[]> {
    const { poolAddress, underlyingTokens, protocolToken } = await this.fetchPoolMetadata(protocolTokenMetadata.address)
    const routerContract = UniswapV2Router02__factory.connect(UNISWAP_V2_ROUTER02_CONTRACT, this.provider,)

    console.log('getAmountsOut')
    // incorrect method 
    const amountsOut = await routerContract['getAmountsOut'](1000000000000000000n, [protocolToken.address, underlyingTokens[0]!.address], { blockTag: blockNumber },)
    console.log({ amountsOut })
    const underlyingRateRaw = amountsOut[1] as bigint
    return [
      {
        type: TokenType.Underlying,
        underlyingRateRaw,
        ...underlyingTokens[0]!,
      },
      {
        type: TokenType.Underlying,
        underlyingRateRaw: 1n / underlyingRateRaw,
        ...underlyingTokens[1]!,
      },
    ]
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }
  async getRewardApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  async getRewardApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Below implementation might fit your metadata if not update it.
   */
  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingTokens } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    return underlyingTokens
  }

  /**
   * Update me.
   * Below implementation might fit your metadata if not update it.
   */
  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }
}
