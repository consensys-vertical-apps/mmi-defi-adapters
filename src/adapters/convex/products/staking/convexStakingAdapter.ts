import { getAddress } from 'ethers'
import {
  LPStakingAdapter,
  StakingProtocolMetadata,
} from '../../../../core/adapters/LPStakingAdapter'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  ProtocolDetails,
  PositionType,
  TokenType,
  GetPositionsInput,
  ProtocolPosition,
  GetEventsInput,
  MovementsByBlock,
  AssetType,
  GetAprInput,
  GetApyInput,
  ProtocolTokenApr,
  ProtocolTokenApy,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { GetCVXMintAmount } from '../../common/cvxRewardFormula'
import {
  ConvexFactory__factory,
  ConvexRewardTracker__factory,
  ConvexRewardsFactory__factory,
  CvxMint__factory,
} from '../../contracts'
import { RewardPaidEvent } from '../../contracts/ConvexRewardsFactory'
import { NotImplementedError } from '../../../../core/errors/errors'

export const CONVEX_TOKEN = {
  address: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  name: 'Convex Token',
  symbol: 'CVX',
  decimals: 18,
}

export class ConvexStakingAdapter
  extends LPStakingAdapter
  implements IMetadataBuilder
{
  productId = 'staking'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Convex',
      description: 'Convex pool adapter',
      siteUrl: 'https://www.convexfinance.com/',
      iconUrl: buildTrustAssetIconUrl(Chain.Ethereum, CONVEX_TOKEN.address),
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'metadata' })
  async buildMetadata() {
    const convexFactory = ConvexFactory__factory.connect(
      '0xF403C135812408BFbE8713b5A23a04b3D48AAE31',
      this.provider,
    )

    const length = await convexFactory.poolLength()

    const metadata: StakingProtocolMetadata = {}
    await Promise.all(
      Array.from({ length: Number(length) }, async (_, i) => {
        const convexData = await convexFactory.poolInfo(i)

        const [
          convexToken,
          underlyingToken,
          rewardTokens,
          [extraRewardTokens, extraRewardTokenManagers],
        ] = await Promise.all([
          getTokenMetadata(convexData.token, this.chainId, this.provider),
          getTokenMetadata(convexData.lptoken, this.chainId, this.provider),
          this.getRewardTokenMetadata(convexData.crvRewards),
          this.getExtraRewardTokenMetadata(convexData.crvRewards),
        ])

        metadata[getAddress(convexData.crvRewards)] = {
          protocolToken: {
            ...convexToken,
            address: getAddress(convexData.crvRewards),
          },
          underlyingToken,
          rewardTokens,
          extraRewardTokens,
          extraRewardTokenManagers,
        }
      }),
    )

    return metadata
  }

  async getRewardPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens()

    const balances = await filterMapAsync(
      protocolTokens,
      async (protocolToken) => {
        if (
          protocolTokenAddresses &&
          !protocolTokenAddresses.includes(protocolToken.address)
        ) {
          return undefined
        }

        const rewardManager = ConvexRewardsFactory__factory.connect(
          protocolToken.address,
          this.provider,
        )

        const crvRewardBalance = await rewardManager
          .earned(userAddress, {
            blockTag: blockNumber,
          })
          .catch(() => 0n)

        if (crvRewardBalance == 0n) return

        const poolMetadata = await this.fetchPoolMetadata(protocolToken.address)
        const crvRewardMetadata = poolMetadata.rewardTokens![0]!

        const cvxTokenContract = CvxMint__factory.connect(
          CONVEX_TOKEN.address,
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
              ...CONVEX_TOKEN,
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
  async getExtraRewardPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens()

    const balances: ProtocolPosition[] = await filterMapAsync(
      protocolTokens,
      async (protocolToken) => {
        if (
          protocolTokenAddresses &&
          !protocolTokenAddresses.includes(protocolToken.address)
        ) {
          return undefined
        }

        const { extraRewardTokens, extraRewardTokenManagers } =
          await this.fetchPoolMetadata(protocolToken.address)

        // If extraRewards is empty or undefined, skip this protocolToken
        if (!extraRewardTokens || extraRewardTokens.length === 0) return

        const underlying = await filterMapAsync(
          extraRewardTokens,
          async (extraRewardToken, index) => {
            const extraRewardTokenContract =
              ConvexRewardTracker__factory.connect(
                extraRewardTokenManagers![index]!,
                this.provider,
              )

            const balance = await extraRewardTokenContract
              .earned(userAddress, { blockTag: blockNumber })
              .catch(() => 0n)

            if (balance == 0n) return

            return {
              type: TokenType.UnderlyingClaimable,
              ...extraRewardToken,
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

  async getRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const mainRewardTrackerContract = ConvexRewardsFactory__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const { protocolToken, rewardTokens } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    const [protocolRewardToken] = rewardTokens!

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

    const results = eventResults.map(async (event) => {
      const {
        blockNumber,
        args: { reward: protocolTokenMovementValueRaw },
        transactionHash,
      } = event

      const cvxTokenContract = CvxMint__factory.connect(
        CONVEX_TOKEN.address,
        this.provider,
      )
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
            ...protocolRewardToken!,
            balanceRaw: protocolTokenMovementValueRaw,
            type: TokenType.Underlying,
          },
          {
            ...CONVEX_TOKEN,
            balanceRaw: cvxReward,

            type: TokenType.Underlying,
          },
        ],
        blockNumber: blockNumber,
      }
    })

    return await Promise.all(results)
  }
  async getExtraRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const {
      protocolToken,
      extraRewardTokens: protocolRewardTokens,
      extraRewardTokenManagers,
    } = await this.fetchPoolMetadata(protocolTokenAddress)

    const responsePromises = protocolRewardTokens?.map(
      async (extraRewardToken, index) => {
        const extraRewardTracker = ConvexRewardTracker__factory.connect(
          extraRewardTokenManagers![index]!,
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
                ...extraRewardToken,
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

  private async getRewardTokenMetadata(
    crvRewards: string,
  ): Promise<Erc20Metadata[]> {
    const rewardManager = ConvexRewardsFactory__factory.connect(
      crvRewards,
      this.provider,
    )

    const rewardToken = await rewardManager.rewardToken()

    const crvRewardMetadata = await getTokenMetadata(
      rewardToken,
      this.chainId,
      this.provider,
    )

    return [crvRewardMetadata]
  }
  private async getExtraRewardTokenMetadata(
    crvRewards: string,
  ): Promise<[Erc20Metadata[], string[]]> {
    const rewardManager = ConvexRewardsFactory__factory.connect(
      crvRewards,
      this.provider,
    )

    const extraRewardsLength = await rewardManager.extraRewardsLength()

    const extraRewards: Erc20Metadata[] = []
    const extraRewardTokensManager: string[] = []

    if (extraRewardsLength > 0n) {
      await Promise.all(
        Array.from({ length: Number(extraRewardsLength) }, async (_, i) => {
          const extraRewardTrackerAddress = await rewardManager.extraRewards(i)

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

          extraRewards.push(rewardTokenMetadata)
          extraRewardTokensManager.push(getAddress(extraRewardTrackerAddress))
        }),
      )
    }

    return [extraRewards, extraRewardTokensManager]
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }
}
