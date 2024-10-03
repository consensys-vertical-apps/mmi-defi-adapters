import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { ProtocolToken } from '../../../../types/IProtocolAdapter'
import {
  GetEventsInput,
  GetPositionsInputWithTokenAddresses,
  GetRewardPositionsInput,
  MovementsByBlock,
  PositionType,
  ProtocolDetails,
  ProtocolPosition,
  TokenType,
  UnderlyingReward,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { CONVEX_FACTORY_ADDRESS } from '../../common/constants'
import {
  ConvexFactorySidechain__factory,
  ConvexRewardFactorySidechain__factory,
} from '../../contracts'
import { RewardPaidEvent } from '../../contracts/ConvexRewardFactorySidechain'

const PRICE_PEGGED_TO_ONE = 1

type ExtraRewardToken = Erc20Metadata & {
  manager: string
}

type AdditionalMetadata = {
  underlyingTokens: Erc20Metadata[]
  extraRewardTokens: ExtraRewardToken[]
}

export class ConvexSidechainStakingAdapter extends SimplePoolAdapter<AdditionalMetadata> {
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

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number,
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

  @CacheToDb()
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const convexFactory = ConvexFactorySidechain__factory.connect(
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
            getTokenMetadata(convexData.rewards, this.chainId, this.provider), // convex staking contract is missing name, symbol, decimal
            getTokenMetadata(convexData.lptoken, this.chainId, this.provider),
            this.getExtraRewardTokensMetadata(convexData.rewards),
          ])

        metadata.push({
          ...convexToken,
          underlyingTokens: [underlyingToken],
          extraRewardTokens,
        })
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
            ...rewardTokenMetadata,
            manager: rewardTokenMetadata.address,
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
        const { extraRewardTokens, address, name, decimals, symbol } =
          await this.helpers.getProtocolTokenByAddress({
            protocolTokens: await this.getProtocolTokens(),
            protocolTokenAddress,
          })

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
          address,
          name,
          decimals,
          symbol,
          type: TokenType.Reward,
          balanceRaw: 0n,
          tokens: await Promise.all(
            balances.map(async (balance) => {
              return {
                type: TokenType.UnderlyingClaimable,
                // TODO - Use DB
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

  async getExtraRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const protocolToken =
      await this.fetchProtocolTokenMetadata(protocolTokenAddress)

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
              // TODO - Use DB
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

  async getExtraRewardPositions({
    userAddress,
    blockNumber,
    protocolTokenAddress,
    tokenId,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const extraRewardTokenContract =
      ConvexRewardFactorySidechain__factory.connect(
        protocolTokenAddress,
        this.provider,
      )

    const balances = await extraRewardTokenContract.earned.staticCall(
      userAddress,
      { blockTag: blockNumber },
    )

    return await Promise.all(
      balances.map(async (balance) => {
        return {
          type: TokenType.UnderlyingClaimable,
          // TODO - Use DB
          ...(await getTokenMetadata(
            balance.token,
            this.chainId,
            this.provider,
          )),
          balanceRaw: balance.amount,
        }
      }),
    )
  }
}
