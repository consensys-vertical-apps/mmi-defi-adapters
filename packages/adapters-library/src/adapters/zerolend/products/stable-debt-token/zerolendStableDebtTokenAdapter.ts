import {
  type AdapterSettings,
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'
import { ZeroLendBasePoolAdapter } from '../../common/zerolendBasePoolAdapter.js'
import type { ProtocolDataProvider } from '../../contracts/index.js'

export class ZeroLendStableDebtTokenPoolAdapter extends ZeroLendBasePoolAdapter {
  productId = 'stable-debt-token'

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'ZeroLend StableDebtToken', // TODO change
      description: 'ZeroLend defi adapter for stable interest-accruing token', // TODO change
      siteUrl: 'https://app.zerolend.xyz/',
      iconUrl: 'https://app.zerolend.xyz/favicon.ico',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      productId: this.productId,
    }
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
