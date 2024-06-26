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
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInputWithTokenAddresses,
  MovementsByBlock,
  PositionType,
  ProtocolDetails,
  ProtocolPosition,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { CONVEX_FACTORY_ADDRESS } from '../../common/constants'
import { GetCVXMintAmount } from '../../common/cvxRewardFormula'
import {
  ConvexFactory__factory,
  ConvexRewardTracker__factory,
  ConvexRewardsFactory__factory,
  CvxMint__factory,
} from '../../contracts'
import { RewardPaidEvent } from '../../contracts/ConvexRewardsFactory'

export const CONVEX_TOKEN_ADDRESS = '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b'

export class ConvexStakingAdapter
  extends LpStakingAdapter
  implements IMetadataBuilder
{
  productId = 'staking'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: true,
  }

  private async getCrv(): Promise<Erc20Metadata> {
    const convexFactory = ConvexFactory__factory.connect(
      CONVEX_FACTORY_ADDRESS,
      this.provider,
    )

    return getTokenMetadata(
      await convexFactory.crv(),
      this.chainId,
      this.provider,
    )
  }
  private async getMinter(): Promise<Erc20Metadata> {
    const convexFactory = ConvexFactory__factory.connect(
      CONVEX_FACTORY_ADDRESS,
      this.provider,
    )

    return getTokenMetadata(
      await convexFactory.minter(),
      this.chainId,
      this.provider,
    )
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Convex',
      description: 'Convex pool adapter',
      siteUrl: 'https://www.convexfinance.com/',
      iconUrl: buildTrustAssetIconUrl(Chain.Ethereum, CONVEX_TOKEN_ADDRESS),
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'metadata' })
  async buildMetadata() {
    const convexFactory = ConvexFactory__factory.connect(
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
            getTokenMetadata(convexData.token, this.chainId, this.provider),
            getTokenMetadata(convexData.lptoken, this.chainId, this.provider),
            this.getExtraRewardTokenMetadata(convexData.crvRewards),
          ])

        metadata[getAddress(convexData.crvRewards)] = {
          protocolToken: {
            ...convexToken,
            address: getAddress(convexData.crvRewards),
          },
          underlyingToken,
          extraRewardTokens,
        }
      }),
    )

    return metadata
  }

  async getRewardPositionsLpStakingAdapter({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInputWithTokenAddresses): Promise<ProtocolPosition[]> {
    const balances = await filterMapAsync(
      protocolTokenAddresses,
      async (protocolAddress) => {
        const rewardManager = ConvexRewardsFactory__factory.connect(
          protocolAddress,
          this.provider,
        )

        const crvRewardBalance = await rewardManager.earned(userAddress, {
          blockTag: blockNumber,
        })

        if (crvRewardBalance === 0n) return

        const { protocolToken } = await this.fetchPoolMetadata(protocolAddress)
        const crvRewardMetadata = await this.getCrv()
        const convexRewardMetadata = await this.getMinter()

        const cvxTokenContract = CvxMint__factory.connect(
          convexRewardMetadata.address,
          this.provider,
        )
        const cvxSupply = await cvxTokenContract.totalSupply({
          blockTag: blockNumber,
        })

        const cvxBalance = GetCVXMintAmount(crvRewardBalance, cvxSupply)

        const result: ProtocolPosition = {
          ...protocolToken,
          type: TokenType.Reward,

          balanceRaw: 0n,
          tokens: [
            {
              ...crvRewardMetadata!,
              type: TokenType.UnderlyingClaimable,
              balanceRaw: crvRewardBalance,
            },
            {
              ...convexRewardMetadata,
              type: TokenType.UnderlyingClaimable,
              balanceRaw: cvxBalance,
            },
          ],
        }

        return result
      },
    )

    return balances
  }
  async getExtraRewardPositionsLpStakingAdapter({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInputWithTokenAddresses): Promise<ProtocolPosition[]> {
    const balances: ProtocolPosition[] = await filterMapAsync(
      protocolTokenAddresses,
      async (protocolTokenAddress) => {
        const { protocolToken, extraRewardTokens } =
          await this.fetchPoolMetadata(protocolTokenAddress)

        // If extraRewards is empty or undefined, skip this protocolToken
        if (!extraRewardTokens || extraRewardTokens.length === 0) return

        const underlying = await filterMapAsync(
          extraRewardTokens,
          async (extraRewardToken) => {
            const extraRewardTokenContract =
              ConvexRewardTracker__factory.connect(
                extraRewardToken.manager,
                this.provider,
              )

            const balance = await extraRewardTokenContract.earned(userAddress, {
              blockTag: blockNumber,
            })

            if (balance === 0n) return

            return {
              type: TokenType.UnderlyingClaimable,
              ...extraRewardToken.token,
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
  async getRewardWithdrawalsLpStakingAdapter({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const mainRewardTrackerContract = ConvexRewardsFactory__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    const convexToken = await this.getMinter()
    const crvToken = await this.getCrv()

    const filter =
      mainRewardTrackerContract.filters['RewardPaid(address,uint256)'](
        userAddress,
      )

    const eventResults =
      await mainRewardTrackerContract.queryFilter<RewardPaidEvent.Event>(
        filter,
        fromBlock,
        toBlock,
      )

    const cvxTokenContract = CvxMint__factory.connect(
      convexToken.address,
      this.provider,
    )

    const results = eventResults.map(async (event) => {
      const {
        blockNumber,
        args: { reward: protocolTokenMovementValueRaw },
        transactionHash,
      } = event

      const cvxSupply = await cvxTokenContract.totalSupply({
        blockTag: blockNumber,
      })

      const cvxReward = GetCVXMintAmount(
        protocolTokenMovementValueRaw,
        cvxSupply,
      )

      return {
        transactionHash,
        protocolToken,
        tokens: [
          {
            ...crvToken,
            balanceRaw: protocolTokenMovementValueRaw,
            type: TokenType.Underlying,
          },
          {
            ...convexToken,
            balanceRaw: cvxReward,

            type: TokenType.Underlying,
          },
        ],
        blockNumber: blockNumber,
      }
    })

    return await Promise.all(results)
  }
  async getExtraRewardWithdrawalsLpStakingAdapter({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const { protocolToken, extraRewardTokens } =
      await this.fetchPoolMetadata(protocolTokenAddress)

    const responsePromises = extraRewardTokens!.map(
      async (extraRewardToken) => {
        const extraRewardTracker = ConvexRewardTracker__factory.connect(
          extraRewardToken.manager,
          this.provider,
        )

        const filter =
          extraRewardTracker.filters['RewardPaid(address,uint256)'](userAddress)

        const eventResults =
          await extraRewardTracker.queryFilter<RewardPaidEvent.Event>(
            filter,
            fromBlock,
            toBlock,
          )

        return eventResults.map((event) => {
          const {
            blockNumber,
            args: { reward: protocolTokenMovementValueRaw },
            transactionHash,
          } = event

          return {
            transactionHash: transactionHash,
            protocolToken,
            tokens: [
              {
                ...extraRewardToken.token,
                balanceRaw: protocolTokenMovementValueRaw,
                type: TokenType.Underlying,
              },
            ],
            blockNumber: blockNumber,
          }
        })
      },
    )

    if (!responsePromises) return []

    const nestedResults = await Promise.all(responsePromises)
    const response: MovementsByBlock[] = nestedResults.flat()

    return response
  }

  private async getExtraRewardTokenMetadata(
    crvRewards: string,
  ): Promise<ExtraRewardToken[]> {
    const rewardManager = ConvexRewardsFactory__factory.connect(
      crvRewards,
      this.provider,
    )

    const extraRewardsLength = await rewardManager.extraRewardsLength()

    const extraRewards: ExtraRewardToken[] = []

    if (extraRewardsLength > 0n) {
      await Promise.all(
        Array.from({ length: Number(extraRewardsLength) }, async (_, i) => {
          const extraRewardTokenManager = await rewardManager.extraRewards(i)

          const extraRewardTrackerContract =
            ConvexRewardTracker__factory.connect(
              extraRewardTokenManager,
              this.provider,
            )

          const rewardToken = await extraRewardTrackerContract.rewardToken()

          const rewardTokenMetadata = await getTokenMetadata(
            rewardToken,
            this.chainId,
            this.provider,
          )

          extraRewards.push({
            token: rewardTokenMetadata,
            manager: extraRewardTokenManager,
          })
        }),
      )
    }

    return extraRewards
  }
}
