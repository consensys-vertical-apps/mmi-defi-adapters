import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'
import { AaveBasePoolAdapter } from '../../common/aaveBasePoolAdapter'
import { ProtocolDataProvider } from '../../contracts'

export class AaveV2StableDebtTokenPoolAdapter extends AaveBasePoolAdapter {
  productId = 'stable-debt-token'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Aave v2 StableDebtToken',
      description: 'Aave v2 defi adapter for stable interest-accruing token',
      siteUrl: 'https://aave.com/',
      iconUrl: 'https://aave.com/favicon.ico',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens() {
    return super.getProtocolTokens()
  }

  protected getReserveTokenAddress(
    reserveTokenAddresses: Awaited<
      ReturnType<ProtocolDataProvider['getReserveTokensAddresses']>
    >,
  ): string {
    return reserveTokenAddresses.stableDebtTokenAddress
  }

  protected getReserveTokenRate(
    reserveData: Awaited<ReturnType<ProtocolDataProvider['getReserveData']>>,
  ): bigint {
    return reserveData.stableBorrowRate
  }
}
