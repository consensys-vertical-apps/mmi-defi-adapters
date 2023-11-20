import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { filterMapSync } from '../../../../core/utils/filters'
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
  ProtocolAdapterParams,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { getPoolData } from '../../common/getPoolData'
import { MetaRegistry__factory } from '../../contracts'
import { CURVE_META_REGISTRY_CONTRACT } from '../pool/curvePoolAdapter'

type CurveStakingAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
  }
>
const PRICE_PEGGED_TO_ONE = 1
export class CurveStakingAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'staking'

  poolAdapter: IProtocolAdapter & IMetadataBuilder

  constructor(params: ProtocolAdapterParams) {
    super(params)

    this.poolAdapter = params.adaptersController.fetchAdapter(
      params.chainId,
      params.protocolId,
      'pool',
    ) as IProtocolAdapter & IMetadataBuilder
  }

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Curve staking',
      description: 'Curve staking adapter',
      siteUrl: 'https://curve.fi/',
      iconUrl:
        'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/crv.svg',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    const metadata = {} as CurveStakingAdapterMetadata
    const metaRegistryContract = MetaRegistry__factory.connect(
      CURVE_META_REGISTRY_CONTRACT,
      this.provider,
    )

    const poolCount = Number(await metaRegistryContract.pool_count())

    const poolDataPromises = Array.from({ length: poolCount }, (_, i) =>
      getPoolData(i, this.chainId, this.provider),
    )

    const results = await Promise.all(poolDataPromises)

    filterMapSync(results, async (token) => {
      if (!token || !token.stakingToken || token.stakingToken == ZERO_ADDRESS) {
        return undefined
      }

      metadata[token.stakingToken] = {
        protocolToken: {
          ...token.protocolToken, // curve staking tokens dont have name, decimals, and symbol on their token contracts
          address: token.stakingToken,
        },
        underlyingTokens: [token.protocolToken],
      }
    })

    return metadata
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
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata(
      protocolTokenBalance.address,
    )

    const curveLPTokenUnderlyingRates =
      await this.poolAdapter.getProtocolTokenToUnderlyingTokenRate({
        protocolTokenAddress: underlyingToken!.address,
        blockNumber,
      })

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        balanceRaw: protocolTokenBalance.balanceRaw,
        tokens: curveLPTokenUnderlyingRates.tokens!.map((underlying) => {
          return {
            address: underlying.address,
            name: underlying.name,
            symbol: underlying.symbol,
            decimals: underlying.decimals,
            type: TokenType.Underlying,
            balanceRaw:
              (protocolTokenBalance.balanceRaw * underlying.underlyingRateRaw) /
              BigInt(10) ** BigInt(protocolTokenBalance.decimals),
          }
        }),
      },
    ]
  }

  protected async getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    const { underlyingTokens } = await this.fetchPoolMetadata(
      protocolTokenMetadata.address,
    )

    // Stake tokens always pegged one to one to underlying
    const pricePerShareRaw = BigInt(
      PRICE_PEGGED_TO_ONE * 10 ** protocolTokenMetadata.decimals,
    )

    return [
      {
        ...underlyingTokens[0]!,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
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

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const [underlyingLpToken] = await this.fetchUnderlyingTokensMetadata(
      protocolTokenAddress,
    )

    return await this.getMovements({
      protocolToken: await this.fetchProtocolTokenMetadata(
        protocolTokenAddress,
      ),
      underlyingTokens: await this.fetchUnderlyingTokensMetadata(
        protocolTokenAddress,
      ),
      filter: {
        smartContractAddress: underlyingLpToken!.address, // curve staking contracts dont have transfer events
        fromBlock,
        toBlock,
        from: userAddress,
        to: protocolTokenAddress,
      },
    })
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const [underlyingLpToken] = await this.fetchUnderlyingTokensMetadata(
      protocolTokenAddress,
    )
    return await this.getMovements({
      protocolToken: await this.fetchProtocolTokenMetadata(
        protocolTokenAddress,
      ),
      underlyingTokens: await this.fetchUnderlyingTokensMetadata(
        protocolTokenAddress,
      ),
      filter: {
        smartContractAddress: underlyingLpToken!.address, // curve staking contracts dont have transfer events
        fromBlock,
        toBlock,
        from: protocolTokenAddress,
        to: userAddress,
      },
    })
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
    console.log({ protocolTokenAddress })
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }
}
