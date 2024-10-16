import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import {
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'
import { AaveBasePoolAdapter } from '../../../aave-v2/common/aaveBasePoolAdapter.js'
import type { ProtocolDataProvider } from '../../../aave-v2/contracts/index.js'

export class AaveV3StableDebtTokenPoolAdapter extends AaveBasePoolAdapter {
  productId = 'stable-debt-token'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Aave v3 StableDebtToken',
      description: 'Aave v3 defi adapter for stable interest-accruing token',
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
