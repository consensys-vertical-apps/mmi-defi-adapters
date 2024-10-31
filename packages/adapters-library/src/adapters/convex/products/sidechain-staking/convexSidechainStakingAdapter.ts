import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { filterMapSync } from '../../../../core/utils/filters'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  GetEventsInput,
  GetPositionsInput,
  GetRewardPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  MovementsByBlockReward,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { CONVEX_FACTORY_ADDRESS } from '../../common/constants'
import {
  ConvexFactorySidechain__factory,
  ConvexRewardFactorySidechain__factory,
} from '../../contracts'
import { RewardPaidEvent } from '../../contracts/ConvexRewardFactorySidechain'

type ExtraRewardToken = Erc20Metadata & {
  manager: string
}

type AdditionalMetadata = {
  poolId: number
  extraRewardTokens: ExtraRewardToken[]
}

export class ConvexSidechainStakingAdapter implements IProtocolAdapter {
  productId = 'sidechain-staking'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: true,
  }

  private provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
    helpers,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
    this.helpers = helpers
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

  @CacheToDb
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
            this.helpers.getTokenMetadata(convexData.rewards), // convex staking contract is missing name, symbol, decimal
            this.helpers.getTokenMetadata(convexData.lptoken),
            this.getExtraRewardTokensMetadata(convexData.rewards),
          ])

        metadata.push({
          ...convexToken,
          poolId: i,
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

          const rewardTokenMetadata =
            await this.helpers.getTokenMetadata(rewardToken)

          extraRewards.push({
            ...rewardTokenMetadata,
            manager: rewardTokenMetadata.address,
          })
        }),
      )
    }

    return extraRewards
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens()

    if (input.protocolTokenAddresses) {
      return await this.helpers.getBalanceOfTokens({
        ...input,
        protocolTokens,
      })
    }

    const protocolTokenAddresses = await this.openPositions({
      protocolTokens,
      userAddress: input.userAddress,
      blockNumber: input.blockNumber,
    })

    return await this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokenAddresses,
      protocolTokens,
    })
  }

  private async openPositions({
    protocolTokens,
    userAddress,
    blockNumber,
  }: {
    protocolTokens: ProtocolToken<AdditionalMetadata>[]
    userAddress: string
    blockNumber?: number
  }): Promise<string[]> {
    const convexFactory = ConvexFactorySidechain__factory.connect(
      CONVEX_FACTORY_ADDRESS,
      this.provider,
    )

    const depositedFilter = convexFactory.filters.Deposited(
      userAddress,
      undefined,
      undefined,
    )

    const userDepositedEvents = await convexFactory.queryFilter(
      depositedFilter,
      undefined,
      blockNumber,
    )

    const protocolTokenAddresses = filterMapSync(
      userDepositedEvents,
      (event) =>
        protocolTokens.find(
          (pool) => pool.poolId === Number(event.args?.poolid),
        )?.address,
    )

    return [...new Set(protocolTokenAddresses)]
  }

  async unwrap({
    blockNumber,
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const { underlyingTokens, extraRewardTokens, ...protocolToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    return this.helpers.unwrapOneToOne({
      protocolToken: protocolToken,
      underlyingTokens,
    })
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.withdrawals({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.deposits({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()

    return await this.helpers.tvl({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
  }

  async getExtraRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlockReward[]> {
    const { name, symbol, decimals, address, extraRewardTokens } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

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
          protocolToken: { name, address, decimals, symbol },
          tokens: [
            {
              // TODO - Use DB
              ...(await this.helpers.getTokenMetadata(_rewardToken)),
              balanceRaw: protocolTokenMovementValueRaw,
              type: TokenType.UnderlyingClaimable,
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
          ...(await this.helpers.getTokenMetadata(balance.token)),
          balanceRaw: balance.amount,
        }
      }),
    )
  }
}
