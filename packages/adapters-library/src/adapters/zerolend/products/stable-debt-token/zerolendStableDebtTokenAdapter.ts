import {
  AdapterSettings,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'
import { ZeroLendBasePoolAdapter } from '../../common/zerolendBasePoolAdapter'
import { ProtocolDataProvider } from '../../contracts'

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
      iconUrl: 'https://zerolend.xyz/favicon.ico',
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
