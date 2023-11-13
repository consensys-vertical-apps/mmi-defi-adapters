import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import {
  ProtocolDetails,
  PositionType,
  GetEventsInput,
  MovementsByBlock,
  GetAprInput,
  GetApyInput,
  GetTotalValueLockedInput,
  TokenBalance,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenTvl,
  UnderlyingTokenRate,
  Underlying,
  ProtocolRewardPosition,
  GetClaimableRewardsInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { GlpManager__factory, Vault__factory } from '../../contracts'

type GMXGlpAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
  }
>

export class GMXGlpAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'glp'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'GMX',
      description: 'GMX Liquidity Provider Token adapter',
      siteUrl: 'https://https://app.gmx.io',
      iconUrl:
        'https://gmx.io//static/media/ic_gmx_40.72a1053e8344ef876100ac72aff70ead.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'glp' })
  async buildMetadata(): Promise<GMXGlpAdapterMetadata> {
    const glpManegerContractAddresses: Partial<Record<Chain, string>> = {
      [Chain.Arbitrum]: '0x321f653eed006ad1c29d174e17d96351bde22649',
      [Chain.Avalanche]: '0xe1ae4d4b06a5fe1fc288f6b4cd72f9f8323b107f',
    }

    const glpManagerContract = GlpManager__factory.connect(
      glpManegerContractAddresses[this.chainId]!,
      this.provider,
    )

    const [vaultAddressPromise, glpTokenAddressPromise] = [
      glpManagerContract.vault(),
      glpManagerContract.glp(),
    ]

    const vaultAddress = await vaultAddressPromise
    const vaultContract = Vault__factory.connect(vaultAddress, this.provider)

    const allWhitelistedTokensLength =
      await vaultContract.allWhitelistedTokensLength()

    const underlyingTokens = await Promise.all(
      [...Array(Number(allWhitelistedTokensLength)).keys()].map(
        async (index) => {
          const underlyingTokenAddress =
            await vaultContract.allWhitelistedTokens(index)

          const underlyingToken = await getTokenMetadata(
            underlyingTokenAddress,
            this.chainId,
            this.provider,
          )

          return underlyingToken
        },
      ),
    )

    const glpTokenAddress = await glpTokenAddressPromise
    const protocolToken = await getTokenMetadata(
      glpTokenAddress,
      this.chainId,
      this.provider,
    )

    return {
      [glpTokenAddress]: {
        protocolToken,
        underlyingTokens,
      },
    }
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
   * Add logic to return current claimable rewards.
   * Ensure you support blocknumber override param
   *
   */
  async getClaimableRewards(
    _input: GetClaimableRewardsInput,
  ): Promise<ProtocolRewardPosition[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to return claimed rewards between blocknumber range
   * Implement as you wish, use event logs or chain data if possible
   *
   */
  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
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
  async getRewardApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  async getRewardApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Below implementation might fit your metadata if not update it.
   */
  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingTokens } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    return underlyingTokens
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
