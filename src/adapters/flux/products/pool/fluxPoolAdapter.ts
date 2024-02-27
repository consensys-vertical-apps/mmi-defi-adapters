import { getAddress } from 'ethers'
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
import { Comptroller__factory, FToken__factory } from '../../contracts'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'

// https://docs.fluxfinance.com/addresses
export const FLUX_COMPTROLLER_CONTRACT = getAddress(
  '0x95Af143a021DF745bc78e845b54591C53a8B3A51',
)

type FluxAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
  }
>

export class FluxPoolAdapter extends SimplePoolAdapter implements IMetadataBuilder {
  productId = 'pool'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Flux',
      description: 'Flux pool adapter',
      siteUrl: 'https://fluxfinance.com',
      iconUrl: 'https://docs.fluxfinance.com/img/favicon.svg',
      positionType: PositionType.Lend,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
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
    const fluxAdapterMetaData: FluxAdapterMetadata = {}
    const comptrollerContract = Comptroller__factory.connect(
      FLUX_COMPTROLLER_CONTRACT,
      this.provider,
    )

    // const markets = await comptrollerContract.getAllMarkets()
    // markets.forEach(async (market) => {
    //   const fTokenContract = await FToken__factory.connect(
    //     market,
    //     this.provider,
    //   )
    //   const underlyingToken = await fTokenContract.underlying()
    //   fluxAdapterMetaData[market] = {
    //     protocolToken: market,
    //     underlyingTokens: [underlyingToken],
    //   }
    // })

    return fluxAdapterMetaData
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    const comptrollerContract = Comptroller__factory.connect(
      FLUX_COMPTROLLER_CONTRACT,
      this.provider,
    )
    const protocolTokens = await comptrollerContract.getAllMarkets()
    return Promise.all(protocolTokens.map(
      (protocolTokenAddress) => getTokenMetadata(protocolTokenAddress, this.chainId, this.provider)
    ))
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
    // const tokens = await this.getProtocolTokens()
    throw new NotImplementedError()
    // const lensContract = MorphoAaveV2Lens__factory.connect(
    //   this.lensAddress,
    //   this.provider,
    // )
    // const positionType = this.getProtocolDetails().positionType
    // return Promise.all(
    //   tokens.map(async (tokenMetadata) => {
    //     let totalValueRaw

    //     if (positionType === PositionType.Supply) {
    //       const [poolSupply, p2pSupply] =
    //         await lensContract.getTotalMarketSupply(tokenMetadata.address, {
    //           blockTag: blockNumber,
    //         })
    //       totalValueRaw = poolSupply + p2pSupply
    //     } else {
    //       // Assuming LensType.Borrow or other types
    //       const [poolBorrow, p2pBorrow] =
    //         await lensContract.getTotalMarketBorrow(tokenMetadata.address, {
    //           blockTag: blockNumber,
    //         })
    //       totalValueRaw = poolBorrow + p2pBorrow
    //     }

    //     return {
    //       ...tokenMetadata,
    //       type: TokenType.Protocol,
    //       totalSupplyRaw: totalValueRaw !== undefined ? totalValueRaw : 0n,
    //     }
    //   }),
    // )
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

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const fTokenContract = FToken__factory.connect(
      protocolTokenAddress,
      this.provider,
    )
    const underlyingToken = await fTokenContract.underlying()
    const underlyingTokenMetadata = await getTokenMetadata(
      underlyingToken,
      this.chainId,
      this.provider,
    )
    return [underlyingTokenMetadata]
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
