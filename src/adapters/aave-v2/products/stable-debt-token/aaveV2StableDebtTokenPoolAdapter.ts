import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'
import { ProtocolDataProvider } from '../../contracts'
import { AaveV2BasePoolAdapter } from '../../common/aaveV2BasePoolAdapter'

export class AaveV2StableDebtTokenPoolAdapter extends AaveV2BasePoolAdapter {
  product = 'stable-debt-token'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Aave v2 StableDebtToken',
      description: 'Aave v2 defi adapter for stable interest-accruing token',
      siteUrl: 'https://aave.com/',
      iconUrl: 'https://aave.com/favicon.ico',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      product: this.product,
    }
  }

  @CacheToFile({ fileKey: 'stable-debt-token' })
  async buildMetadata() {
    return super.buildMetadata()
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
