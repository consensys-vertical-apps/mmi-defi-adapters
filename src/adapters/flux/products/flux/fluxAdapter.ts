import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
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
  AssetType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'

type FluxAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
  }
>

export class FluxAdapter extends SimplePoolAdapter implements IMetadataBuilder {
  productId = 'flux'

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Flux',
      description: 'Flux pool adapter',
      siteUrl: 'https://fluxfinance.com',
      iconUrl: 'https://docs.fluxfinance.com/img/favicon.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.NonStandardErc20,
      },
    }
  }

  /**
   * Update me.
   * Add logic to build protocol token metadata
   * For context see dashboard example ./dashboard.png
   * We need protocol token names, decimals, and also linked underlying tokens
   */
  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return {} as FluxAdapterMetadata
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
}
