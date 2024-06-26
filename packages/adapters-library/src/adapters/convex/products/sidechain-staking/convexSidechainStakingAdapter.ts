import { getAddress } from 'ethers'
import {
  ExtraRewardToken,
  LpStakingAdapter,
  LpStakingProtocolMetadata,
} from '../../../../core/adapters/LpStakingProtocolAdapter'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  GetPositionsInputWithTokenAddresses,
  MovementsByBlock,
  PositionType,
  ProtocolDetails,
  ProtocolPosition,
  TokenType,
  UnderlyingReward,
} from '../../../../types/adapter'
import { CONVEX_FACTORY_ADDRESS } from '../../common/constants'
import {
  ConvexFactorySidechain__factory,
  ConvexRewardFactorySidechain__factory,
} from '../../contracts'
import { RewardPaidEvent } from '../../contracts/ConvexRewardFactorySidechain'

export class ConvexSidechainStakingAdapter
  extends LpStakingAdapter
  implements IMetadataBuilder
{
  productId = 'sidechain-staking'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: true,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Convex',
      description: 'Convex pool adapter',
      siteUrl: 'https://www.convexfinance.com/',
      iconUrl: buildTrustAssetIconUrl(
        Chain.Ethereum,
        '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
      ),
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    const convexFactory = ConvexFactorySidechain__factory.connect(
      CONVEX_FACTORY_ADDRESS,
      this.provider,
    )

    const length = await convexFactory.poolLength()

    const metadata: LpStakingProtocolMetadata = {}
    await Promise.all(
      Array.from({ length: Number(length) }, async (_, i) => {
        const convexData = await convexFactory.poolInfo(i)

        const [convexToken, underlyingToken, extraRewardTokens] =
          await Promise.all([
            getTokenMetadata(convexData.rewards, this.chainId, this.provider), // convex staking contract is missing name, symbol, decimal
            getTokenMetadata(convexData.lptoken, this.chainId, this.provider),

            this.getExtraRewardTokensMetadata(convexData.rewards),
          ])

        metadata[getAddress(convexToken.address)] = {
          protocolToken: {
            ...convexToken,
          },
          underlyingToken,
          extraRewardTokens,
        }
      }),
    )

    return metadata
  }

  private async getExtraRewardTokensMetadata(
    rewards: string,
  ): Promise<ExtraRewardToken[]> {
    const extraRewards: ExtraRewardToken[] = []

    const rewardFactory = ConvexRewardFactorySidechain__factory.connect(
      rewards,
      this.provider,
    )

    const rewardLength = await rewardFactory.rewardLength()

    if (rewardLength > 0n) {
      await Promise.all(
        Array.from({ length: Number(rewardLength) }, async (_, i) => {
          const rewardToken = (await rewardFactory.rewards(i)).reward_token

          const rewardTokenMetadata = await getTokenMetadata(
            rewardToken,
            this.chainId,
            this.provider,
          )

          extraRewards.push({
            manager: rewardTokenMetadata.address,
            token: rewardTokenMetadata,
          })
        }),
      )
    }

    return extraRewards
  }

  async getExtraRewardPositionsLpStakingAdapter({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInputWithTokenAddresses): Promise<ProtocolPosition[]> {
    const balances: ProtocolPosition[] = await filterMapAsync(
      protocolTokenAddresses,
      async (protocolTokenAddress) => {
        const { extraRewardTokens, protocolToken } =
          await this.fetchPoolMetadata(protocolTokenAddress)

        // If extraRewards is empty or undefined, skip this protocolToken
        if (!extraRewardTokens || extraRewardTokens.length === 0) return

        const extraRewardTokenContract =
          ConvexRewardFactorySidechain__factory.connect(
            protocolTokenAddress,
            this.provider,
          )

        const balances = await extraRewardTokenContract.earned.staticCall(
          userAddress,
          { blockTag: blockNumber },
        )

        return {
          ...protocolToken,
          type: TokenType.Reward,
          balanceRaw: 0n,
          tokens: await Promise.all(
            balances.map(async (balance) => {
              return {
                type: TokenType.UnderlyingClaimable,
                ...(await getTokenMetadata(
                  balance.token,
                  this.chainId,
                  this.provider,
                )),
                balanceRaw: balance.amount,
              }
            }),
          ),
        }
      },
    )

    return balances
  }

  /**
   * Not available on side-chains
   */
  async getRewardPositionsLpStakingAdapter(
    _input: GetPositionsInput,
  ): Promise<ProtocolPosition[]> {
    throw new NotImplementedError()
  }

  /**
   * Not available on side-chains
   */
  async getRewardWithdrawalsLpStakingAdapter(
    _input: GetEventsInput,
  ): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getExtraRewardWithdrawalsLpStakingAdapter({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    const extraRewardTracker = ConvexRewardFactorySidechain__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const filter = extraRewardTracker.filters.RewardPaid(userAddress)

    const eventResults =
      await extraRewardTracker.queryFilter<RewardPaidEvent.Event>(
        filter,
        fromBlock,
        toBlock,
      )

    return await Promise.all(
      eventResults.map(async (event) => {
        const {
          blockNumber,
          args: { _rewardAmount: protocolTokenMovementValueRaw, _rewardToken },
          transactionHash,
        } = event

        return {
          transactionHash: transactionHash,
          protocolToken,
          tokens: [
            {
              ...(await getTokenMetadata(
                _rewardToken,
                this.chainId,
                this.provider,
              )),
              balanceRaw: protocolTokenMovementValueRaw,
              type: TokenType.Underlying,
            },
          ],
          blockNumber: blockNumber,
        }
      }),
    )
  }
}
