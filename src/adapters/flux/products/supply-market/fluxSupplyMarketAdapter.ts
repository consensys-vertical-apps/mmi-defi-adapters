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
  TokenBalance,
  ProtocolTokenApr,
  ProtocolTokenApy,
  UnderlyingTokenRate,
  Underlying,
  AssetType,
  GetEventsInput,
  MovementsByBlock,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { buildMetadata } from '../../../compound-v2/common/buildMetadata'
import { Cerc20__factory } from '../../../compound-v2/contracts'
import { contractAddresses } from '../../common/contractAddresses'

export class FluxSupplyMarketAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  productId = 'supply-market'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Flux',
      description: 'Flux supply market adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return await buildMetadata({
      chainId: this.chainId,
      provider: this.provider,
      contractAddresses,
    })
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    return [underlyingToken]
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

  protected async getUnderlyingTokenBalances({
    userAddress,
    protocolTokenBalance,
    blockNumber,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenBalance.address,
    )

    const poolContract = Cerc20__factory.connect(
      protocolTokenBalance.address,
      this.provider,
    )

    const underlyingBalance = await poolContract.balanceOfUnderlying.staticCall(
      userAddress,
      {
        blockTag: blockNumber,
      },
    )

    const underlyingTokenBalance = {
      ...underlyingToken,
      balanceRaw: underlyingBalance,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenMetadata.address,
    )

    const poolContract = Cerc20__factory.connect(
      protocolTokenMetadata.address,
      this.provider,
    )

    const exchangeRateCurrent =
      await poolContract.exchangeRateCurrent.staticCall({
        blockTag: blockNumber,
      })

    // The current exchange rate is scaled by 1 * 10^(18 - 8 + Underlying Token Decimals).
    const adjustedExchangeRate = exchangeRateCurrent / 10n ** 10n

    return [
      {
        ...underlyingToken,
        type: TokenType.Underlying,
        underlyingRateRaw: adjustedExchangeRate,
      },
    ]
  }

  getBorrows(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  getRepays(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }
}
