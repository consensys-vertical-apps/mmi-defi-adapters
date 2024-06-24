import { getAddress } from 'ethers'
import { ExtraRewardToken } from '../../../../core/adapters/LpStakingProtocolAdapter'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import { Replacements } from '../../../../scripts/replacements'
import { RewardsAdapter } from '../../../../scripts/rewardAdapter'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  GetRewardPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  Underlying,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { CONVEX_FACTORY_ADDRESS } from '../../common/constants'
import { GetCVXMintAmount } from '../../common/cvxRewardFormula'
import {
  ConvexFactory__factory,
  ConvexRewardTracker__factory,
  ConvexRewardsFactory__factory,
  CvxMint__factory,
} from '../../contracts'

export const CONVEX_TOKEN_ADDRESS = '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { RewardPaidEvent } from '../../contracts/ConvexRewardsFactory'

export type LpStakingProtocolMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
    extraRewardTokens: ExtraRewardToken[]
  }
>

export class ConvexStakingMainnetAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
  productId = 'staking-mainnet'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

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

  private async getCrv(): Promise<Erc20Metadata> {
    const convexFactory = ConvexFactory__factory.connect(
      CONVEX_FACTORY_ADDRESS,
      this.provider,
    )

    return this.helpers.getTokenMetadata(await convexFactory.crv())
  }
  private async getMinter(): Promise<Erc20Metadata> {
    const convexFactory = ConvexFactory__factory.connect(
      CONVEX_FACTORY_ADDRESS,
      this.provider,
    )

    return this.helpers.getTokenMetadata(await convexFactory.minter())
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
      assetDetails: {
        type: AssetType.StandardErc20,
        missingTransferEvents: true,
      },
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
            this.helpers.getTokenMetadata(convexData.token),
            this.helpers.getTokenMetadata(convexData.lptoken),
            this.getExtraRewardTokenMetadata(convexData.crvRewards),
          ])

        metadata[getAddress(convexData.crvRewards)] = {
          protocolToken: {
            ...convexToken,
            address: getAddress(convexData.crvRewards),
          },
          underlyingTokens: [underlyingToken],
          extraRewardTokens,
        }
      }),
    )

    return metadata
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

          const rewardTokenMetadata =
            await this.helpers.getTokenMetadata(rewardToken)

          extraRewards.push({
            token: rewardTokenMetadata,
            manager: extraRewardTokenManager,
          })
        }),
      )
    }

    return extraRewards
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.withdrawalsUsingUnderlyingTokenTransfers({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
      underlyingTokens: await this.getUnderlyingTokens(protocolTokenAddress),
    })
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.depositsUsingUnderlyingTokenTransfers({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
      underlyingTokens: await this.getUnderlyingTokens(protocolTokenAddress),
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

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    return this.helpers.unwrapOneToOne({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      underlyingTokens: await this.getUnderlyingTokens(protocolTokenAddress),
    })
  }

  private async getProtocolToken(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).protocolToken
  }
  private async getUnderlyingTokens(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).underlyingTokens
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error(
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

  async getRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
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

  async getExtraRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
    tokenId,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const { extraRewardTokens } =
      await this.fetchPoolMetadata(protocolTokenAddress)

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
          ...extraRewardToken.token,
          balanceRaw: balance,
        }
      },
    )

    return underlying
  }

  async getExtraRewardWithdrawals({
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
}
