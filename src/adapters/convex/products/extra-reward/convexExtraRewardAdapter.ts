import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import {
  ResolveUnderlyingMovements,
  ResolveUnderlyingPositions,
} from '../../../../core/decorators/resolveUnderlyingPositions'
import { NotImplementedError } from '../../../../core/errors/errors'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
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
  GetEventsInput,
  MovementsByBlock,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import {
  ConvexFactory__factory,
  ConvexRewardsFactory__factory,
  ConvexRewardTracker__factory,
} from '../../contracts'
import { RewardPaidEvent } from '../../contracts/ConvexRewardTracker'
import { CONVEX_TOKEN } from '../rewards/convexRewardsAdapter'

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

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Convex',
      description: 'Convex pool adapter',
      siteUrl: 'https://www.convexfinance.com/',
      iconUrl: buildTrustAssetIconUrl(Chain.Ethereum, CONVEX_TOKEN.address),
      positionType: PositionType.Reward,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @ResolveUnderlyingPositions
  async getPositions({
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
              type: TokenType.UnderlyingClaimable,
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

  @ResolveUnderlyingMovements
  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const protocolToken = await this.fetchProtocolTokenMetadata(
      protocolTokenAddress,
    )
    const protocolRewardTokens = await this.fetchUnderlyingTokensMetadata(
      protocolTokenAddress,
    )
    const responsePromises = protocolRewardTokens.map(
      async (extraRewardToken) => {
        const extraRewardTracker = ConvexRewardTracker__factory.connect(
          extraRewardToken.claimableTrackerAddress,
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

    const nestedResults = await Promise.all(responsePromises)
    const response: MovementsByBlock[] = nestedResults.flat()

    return response
  }

  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return [] // no deposits for rewards
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

        const rewardFactory = ConvexRewardsFactory__factory.connect(
          convexData.crvRewards,
          this.provider,
        )

        const [convexToken, extraRewardsLength] = await Promise.all([
          getTokenMetadata(convexData.token, this.chainId, this.provider), // convex staking contract is missing name, symbol, decimal
          rewardFactory.extraRewardsLength(),
        ])

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
                claimableTrackerAddress: getAddress(extraRewardTrackerAddress),
              })
            }),
          )

          metadata[getAddress(convexData.crvRewards)] = {
            protocolToken: {
              ...convexToken,
              address: getAddress(convexData.crvRewards),
            },
            underlyingTokens: extraRewards,
          }
        }
      }),
    )

    return metadata
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  protected async getUnderlyingTokenBalances(_input: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    throw new NotImplementedError()
  }

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

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<RewardToken[]> {
    const { underlyingTokens } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    return underlyingTokens
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.warn(
        {
          protocolTokenAddress,
          protocol: this.protocolId,
          chainId: this.chainId,
          product: this.productId,
        },
        'Protocol token pool not found',
      )
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }
}
