import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import {
  ProtocolDetails,
  PositionType,
  TokenBalance,
  UnderlyingTokenRate,
  Underlying,
  AssetType,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { CompoundV2MarketAdapter } from '../../common/compoundV2MarketAdapter'
import { Cerc20__factory } from '../../contracts'

export class CompoundV2SupplyMarketAdapter extends CompoundV2MarketAdapter {
  productId = 'supply-market'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'CompoundV2',
      description: 'CompoundV2 supply market adapter',
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
    return await super.buildMetadata()
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
}
