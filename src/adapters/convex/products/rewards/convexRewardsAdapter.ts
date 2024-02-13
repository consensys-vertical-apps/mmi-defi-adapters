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
import { GetCVXMintAmount } from '../../common/cvxRewardFormula'
import { ConvexFactory__factory, CvxMint__factory } from '../../contracts'
import { RewardPaidEvent } from '../../contracts/ConvexRewardsFactory'
import { ConvexRewardsFactory__factory } from '../../contracts/factories/ConvexRewardsFactory__factory'

type ConvexExtraRewardAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
  }
>

export const CONVEX_TOKEN = {
  address: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  name: 'Convex Token',
  symbol: 'CVX',
  decimals: 18,
}

export class ConvexRewardsAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'rewards'
  isWrappable = false

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

  @ResolveUnderlyingMovements
  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const mainRewardTrackerContract = ConvexRewardsFactory__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const protocolToken = await this.fetchProtocolTokenMetadata(
      protocolTokenAddress,
    )
    const [protocolRewardToken] = await this.fetchUnderlyingTokensMetadata(
      protocolTokenAddress,
    )

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

  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return [] // no deposits for rewards
  }

  @ResolveUnderlyingPositions
  async getPositions({
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

        const [crvRewardMetadata] = await this.fetchUnderlyingTokensMetadata(
          protocolToken.address,
        )!

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
        const rewardManager = ConvexRewardsFactory__factory.connect(
          convexData.crvRewards,
          this.provider,
        )
        const [convexToken, rewardToken] = await Promise.all([
          getTokenMetadata(convexData.token, this.chainId, this.provider), // convex staking contract is missing name, symbol, decimal
          rewardManager.rewardToken(),
        ])

        const crvRewardMetadata = await getTokenMetadata(
          rewardToken,
          this.chainId,
          this.provider,
        )

        metadata[getAddress(convexData.crvRewards)] = {
          protocolToken: {
            ...convexToken,
            address: getAddress(convexData.crvRewards),
          },
          underlyingToken: crvRewardMetadata, // going to hardcode this in underling response
        }
      }),
    )

    return metadata
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    return [underlyingToken] // underlyingTokens
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

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }
}
