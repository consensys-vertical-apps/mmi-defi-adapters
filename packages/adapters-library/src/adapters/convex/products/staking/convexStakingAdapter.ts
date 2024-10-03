import { getAddress } from 'ethers'

import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { ProtocolToken } from '../../../../types/IProtocolAdapter'
import {
  GetEventsInput,
  GetRewardPositionsInput,
  MovementsByBlock,
  PositionType,
  ProtocolDetails,
  TokenType,
  UnderlyingReward,
  UnwrappedTokenExchangeRate,
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

const CONVEX_TOKEN_ADDRESS = '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b'

const PRICE_PEGGED_TO_ONE = 1

type ExtraRewardToken = Erc20Metadata & {
  manager: string
}

type AdditionalMetadata = {
  extraRewardTokens?: ExtraRewardToken[]
}

export class ConvexStakingAdapter extends SimplePoolAdapter<AdditionalMetadata> {
  productId = 'staking'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: true,
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const underlyingTokens = await this.fetchUnderlyingTokensMetadata(
      protocolTokenMetadata.address,
    )

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

  @CacheToDb()
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const convexFactory = ConvexFactory__factory.connect(
      CONVEX_FACTORY_ADDRESS,
      this.provider,
    )

    const length = await convexFactory.poolLength()

    const metadata: ProtocolToken<AdditionalMetadata>[] = []
    await Promise.all(
      Array.from({ length: Number(length) }, async (_, i) => {
        const convexData = await convexFactory.poolInfo(i)

        const [convexToken, underlyingToken, extraRewardTokens] =
          await Promise.all([
            getTokenMetadata(convexData.token, this.chainId, this.provider),
            getTokenMetadata(convexData.lptoken, this.chainId, this.provider),
            this.getExtraRewardTokenMetadata(convexData.crvRewards),
          ])

        metadata.push({
          ...convexToken,
          address: getAddress(convexData.crvRewards),

          underlyingTokens: [underlyingToken],
          extraRewardTokens,
        })
      }),
    )

    return metadata
  }

  async getRewardPositions({
    userAddress,
    blockNumber,
    protocolTokenAddress,
    tokenId,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const rewardManager = ConvexRewardsFactory__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const crvRewardBalance = await rewardManager.earned(userAddress, {
      blockTag: blockNumber,
    })

    if (crvRewardBalance === 0n) return []

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

    return [
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
    ]
  }

  async getExtraRewardPositions({
    userAddress,
    blockNumber,
    protocolTokenAddress,
    tokenId,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const { extraRewardTokens } = await this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })

    // If extraRewards is empty or undefined, skip this protocolToken
    if (!extraRewardTokens || extraRewardTokens.length === 0) return []

    const underlying = await filterMapAsync(
      extraRewardTokens,
      async (extraRewardToken) => {
        const extraRewardTokenContract = ConvexRewardTracker__factory.connect(
          extraRewardToken.manager,
          this.provider,
        )

        const balance = await extraRewardTokenContract.earned(userAddress, {
          blockTag: blockNumber,
        })

        if (balance === 0n) return

        return {
          type: TokenType.UnderlyingClaimable,
          address: extraRewardToken.address,
          symbol: extraRewardToken.symbol,
          name: extraRewardToken.name,
          decimals: extraRewardToken.decimals,
          balanceRaw: balance,
        }
      },
    )

    // If extraRewards is empty or undefined, skip this protocolToken
    if (!underlying || underlying.length === 0) return []

    return underlying
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

    const protocolToken =
      await this.fetchProtocolTokenMetadata(protocolTokenAddress)

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

  async getExtraRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const { name, symbol, decimals, address, extraRewardTokens } =
      await this.helpers.getProtocolTokenByAddress({
        protocolTokens: await this.getProtocolTokens(),
        protocolTokenAddress,
      })

    const responsePromises = (extraRewardTokens ?? []).map(
      async (extraRewardToken: ExtraRewardToken) => {
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
            protocolToken: { name, address, decimals, symbol },
            tokens: [
              {
                address: extraRewardToken.address,
                symbol: extraRewardToken.symbol,
                name: extraRewardToken.name,
                decimals: extraRewardToken.decimals,
                balanceRaw: protocolTokenMovementValueRaw,
                type: TokenType.Underlying,
              },
            ],
            blockNumber: blockNumber,
          }
        })
      },
    )

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
            ...rewardTokenMetadata,
            manager: extraRewardTokenManager,
          })
        }),
      )
    }

    return extraRewards
  }
}
