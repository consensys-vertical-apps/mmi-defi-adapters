import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { buildTrustAssetIconUrl } from '../../../../core/utils/buildIconUrl'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
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
import { GetCVXMintAmount } from '../../common/cvxRewardFormula'
import {
  ConvexFactory__factory,
  ConvexRewardTracker__factory,
  ConvexRewardsFactory__factory,
  CvxMint__factory,
} from '../../contracts'
import { RewardPaidEvent } from '../../contracts/ConvexRewardsFactory'

const CONVEX_TOKEN_ADDRESS = getAddress(
  '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
)
const CRV_TOKEN_ADDRESS = getAddress(
  '0xD533a949740bb3306d119CC777fa900bA034cd52',
)

type ExtraRewardToken = Erc20Metadata & {
  manager: string
}

type AdditionalMetadata = {
  rewardTokens: Erc20Metadata[]
  extraRewardTokens?: ExtraRewardToken[]
}

export class ConvexStakingAdapter implements IProtocolAdapter {
  productId = 'staking'
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
      iconUrl: buildTrustAssetIconUrl(Chain.Ethereum, CONVEX_TOKEN_ADDRESS),
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
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

        const [
          convexToken,
          underlyingToken,
          extraRewardTokens,
          crvToken,
          minterToken,
        ] = await Promise.all([
          this.helpers.getTokenMetadata(convexData.token),
          this.helpers.getTokenMetadata(convexData.lptoken),
          this.getExtraRewardTokenMetadata(convexData.crvRewards),
          this.helpers.getTokenMetadata(CRV_TOKEN_ADDRESS),
          this.helpers.getTokenMetadata(CONVEX_TOKEN_ADDRESS),
        ])

        metadata.push({
          ...convexToken,
          address: getAddress(convexData.crvRewards),
          underlyingTokens: [underlyingToken],
          rewardTokens: [crvToken, minterToken],
          extraRewardTokens,
        })
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

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const positions = await this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })

    for (const position of positions) {
      this.getRewardPositions({
        userAddress: input.userAddress,
        blockNumber: input.blockNumber,
        protocolTokenAddress: position.address,
      }).catch()

      this.getExtraRewardPositions({
        userAddress: input.userAddress,
        blockNumber: input.blockNumber,
        protocolTokenAddress: position.address,
      }).catch()
    }

    return positions
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

  async getRewardPositions({
    userAddress,
    blockNumber,
    protocolTokenAddress,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const { rewardTokens } = this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })

    const crvRewardMetadata = rewardTokens.find(
      (token) => token.address === CRV_TOKEN_ADDRESS,
    )!
    const convexRewardMetadata = rewardTokens.find(
      (token) => token.address === CONVEX_TOKEN_ADDRESS,
    )!

    const rewardManager = ConvexRewardsFactory__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const cvxTokenContract = CvxMint__factory.connect(
      convexRewardMetadata.address,
      this.provider,
    )

    // const [crvRewardBalance, cvxSupply] = await Promise.all([
    //   rewardManager.earned(userAddress, {blockTag: blockNumber}),
    //   cvxTokenContract.totalSupply({ blockTag: blockNumber }),
    // ])

    const crvRewardBalance = await rewardManager.earned(userAddress, {
      blockTag: blockNumber,
    })

    if (crvRewardBalance === 0n) return []

    const cvxSupply = await cvxTokenContract.totalSupply({
      blockTag: blockNumber,
    })

    const cvxBalance = GetCVXMintAmount(crvRewardBalance, cvxSupply)

    return [
      {
        ...crvRewardMetadata,
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
  }: GetEventsInput): Promise<MovementsByBlockReward[]> {
    const { rewardTokens } = await this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })

    const mainRewardTrackerContract = ConvexRewardsFactory__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const { name, symbol, decimals, address } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    const crvRewardMetadata = rewardTokens.find(
      (token) => token.address === CRV_TOKEN_ADDRESS,
    )!
    const convexRewardMetadata = rewardTokens.find(
      (token) => token.address === CONVEX_TOKEN_ADDRESS,
    )!

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
      convexRewardMetadata.address,
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
        protocolToken: {
          address,
          name,
          symbol,
          decimals,
        },
        tokens: [
          {
            ...crvRewardMetadata,
            balanceRaw: protocolTokenMovementValueRaw,
            type: TokenType.UnderlyingClaimable,
          },
          {
            ...convexRewardMetadata,
            balanceRaw: cvxReward,
            type: TokenType.UnderlyingClaimable,
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
  }: GetEventsInput): Promise<MovementsByBlockReward[]> {
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
                type: TokenType.UnderlyingClaimable,
              },
            ],
            blockNumber: blockNumber,
          }
        })
      },
    )

    const nestedResults = await Promise.all(responsePromises)
    const response: MovementsByBlockReward[] = nestedResults.flat()

    return response
  }
}
