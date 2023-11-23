import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { filterMapAsync } from '../../../../core/utils/filters'
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
  GetPositionsInput,
  ProtocolPosition,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  ConvexFactory__factory,
  ConvexRewardsFactory__factory,
  ConvexRewardTracker__factory,
} from '../../contracts'

type RewardToken = { claimableTrackerAddress: string } & Erc20Metadata

type ConvexExtraRewardAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: RewardToken[]
  }
>

export class ConvexExtraRewardAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'extra-reward'

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Convex',
      description: 'Convex pool adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens()

    const balances: ProtocolPosition[] = await filterMapAsync(
      protocolTokens,
      async (protocolToken) => {
        const extraRewards = await this.fetchUnderlyingTokensMetadata(
          protocolToken.address,
        )

        // If extraRewards is empty or undefined, skip this protocolToken
        if (!extraRewards || extraRewards.length === 0) return

        const underlying = await filterMapAsync(
          extraRewards,
          async ({
            address,
            symbol,
            decimals,
            claimableTrackerAddress,
            name,
          }) => {
            const extraRewardTokenContract =
              ConvexRewardTracker__factory.connect(
                claimableTrackerAddress,
                this.provider,
              )

            const balance = await extraRewardTokenContract
              .earned(userAddress, { blockTag: blockNumber })
              .catch(() => 0n)

            if (balance == 0n) return

            return {
              type: TokenType.UnderlyingClaimableFee,
              address,
              symbol,
              decimals,
              name,
              balanceRaw: balance,
            }
          },
        )

        // If extraRewards is empty or undefined, skip this protocolToken
        if (!underlying || underlying.length === 0) return

        return {
          ...protocolToken,
          type: TokenType.Protocol,
          balanceRaw: 0n,
          tokens: underlying,
        }
      },
    )

    return balances
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    const convexFactory = ConvexFactory__factory.connect(
      '0xF403C135812408BFbE8713b5A23a04b3D48AAE31',
      this.provider,
    )

    const length = await convexFactory.poolLength()

    const metadata: ConvexExtraRewardAdapterMetadata = {}
    await Promise.all(
      Array.from({ length: Number(length) }, async (_, i) => {
        const convexData = await convexFactory.poolInfo(i)

        const [convexToken, underlyingToken] = await Promise.all([
          getTokenMetadata(convexData.token, this.chainId, this.provider), // convex staking contract is missing name, symbol, decimal
          getTokenMetadata(convexData.lptoken, this.chainId, this.provider),
        ])

        const rewardFactory = ConvexRewardsFactory__factory.connect(
          convexData.crvRewards,
          this.provider,
        )

        const extraRewardsLength = await rewardFactory.extraRewardsLength()

        const extraRewards: RewardToken[] = []
        if (extraRewardsLength > 0n) {
          await Promise.all(
            Array.from({ length: Number(extraRewardsLength) }, async (_, i) => {
              const extraRewardTrackerAddress =
                await rewardFactory.extraRewards(i)

              const extraRewardTrackerContract =
                ConvexRewardTracker__factory.connect(
                  extraRewardTrackerAddress,
                  this.provider,
                )

              const rewardToken = await extraRewardTrackerContract.rewardToken()

              const rewardTokenMetadata = await getTokenMetadata(
                rewardToken,
                this.chainId,
                this.provider,
              )

              extraRewards.push({
                ...rewardTokenMetadata,
                claimableTrackerAddress: extraRewardTrackerAddress,
              })
            }),
          )

          metadata[convexData.crvRewards.toLowerCase()] = {
            protocolToken: {
              ...convexToken,
              address: convexData.crvRewards.toLowerCase(),
            },
            underlyingTokens: extraRewards,
          }
        }
      }),
    )

    return metadata
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

  /**
   * Update me.
   * Add logic to turn the LP token balance into the correct underlying token(s) balance
   * For context see dashboard example ./dashboard.png
   */
  protected async getUnderlyingTokenBalances(_input: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
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
  protected async getUnderlyingTokenConversionRate(
    _protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    throw new NotImplementedError()
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Below implementation might fit your metadata if not update it.
   */
  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<RewardToken[]> {
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
