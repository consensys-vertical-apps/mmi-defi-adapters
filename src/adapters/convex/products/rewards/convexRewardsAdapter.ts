import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getBalances } from '../../../../core/utils/getBalances'
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
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { GetCVXMintAmount } from '../../common/cvxRewardFormula'
import {
  ConvexFactory__factory,
  ConvexRewardTracker__factory,
  CvxMint__factory,
} from '../../contracts'
import { ConvexRewardsFactory__factory } from '../../contracts/factories/ConvexRewardsFactory__factory'

type RewardToken = { claimableTrackerAddress: string } & Erc20Metadata

type ConvexExtraRewardAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens?: RewardToken[]
  }
>

const CONVEX_TOKEN = {
  address: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  name: 'Convex Token',
  symbol: 'CVX',
  decimals: 18,
}
//@ts-nocheck
export class ConvexRewardsAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'rewards'

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Convex',
      description: 'Convex pool adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens()

    const balances = await filterMapAsync(
      protocolTokens,
      async (protocolToken) => {
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

        const rewardToken = await rewardManager.rewardToken()

        const crvRewardMetadata = await getTokenMetadata(
          rewardToken,
          this.chainId,
          this.provider,
        )

        const cvxTokenContract = CvxMint__factory.connect(
          CONVEX_TOKEN.address,
          this.provider,
        )
        const cvxSupply = await cvxTokenContract.totalSupply()

        const cvxBalance = GetCVXMintAmount(crvRewardBalance, cvxSupply)

        const result: ProtocolPosition = {
          ...protocolToken,
          type: TokenType.Protocol, // update to reward

          balanceRaw: 0n, // I think I should remove this from type, makes no sense here
          tokens: [
            {
              ...crvRewardMetadata,
              type: TokenType.UnderlyingClaimableFee,
              balanceRaw: crvRewardBalance,
            },
            {
              ...CONVEX_TOKEN,
              type: TokenType.UnderlyingClaimableFee,
              balanceRaw: cvxBalance,
            },
          ],
        }

        return result
      },
    )

    return balances
  }

  /**
   * Update me.
   * Add logic to build protocol token metadata
   * For context see dashboard example ./dashboard.png
   * We need protocol token names, decimals, and also linked underlying tokens
   */
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

        const [convexToken, underlyingToken] = await Promise.all([
          getTokenMetadata(convexData.token, this.chainId, this.provider), // convex staking contract is missing name, symbol, decimal
          getTokenMetadata(convexData.lptoken, this.chainId, this.provider),
        ])

        metadata[convexData.crvRewards.toLowerCase()] = {
          protocolToken: {
            ...convexToken,
            address: convexData.crvRewards.toLowerCase(),
          },
          underlyingTokens: undefined, // going to hardcode this in underling response
        }
      }),
    )

    return metadata
  }

  /**
   * Update me.
   * Below implementation might fit your metadata if not update it.
   */
  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<RewardToken[]> {
    const { underlyingTokens } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    return [] // underlyingTokens
  }

  /**
   * Update me.
   * Below implementation might fit your metadata if not update it.
   */
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  /**
   * Update me.
   * Add logic to turn the LP token balance into the correct underlying token(s) balance
   * For context see dashboard example ./dashboard.png
   */
  protected async getUnderlyingTokenBalances(_input: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to find tvl in a pool
   *
   */
  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Below implementation might fit your metadata if not update it.
   */
  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  /**
   * Update me.
   * Add logic that finds the underlying token rates for 1 protocol token
   */
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

  /**
   * Update me.
   * Below implementation might fit your metadata if not update it.
   */
  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }
}
