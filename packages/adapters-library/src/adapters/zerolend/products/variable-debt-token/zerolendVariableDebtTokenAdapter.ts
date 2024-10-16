import {
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'
import type { ProtocolDataProvider } from '../../contracts/index.js'
import { ZeroLendBasePoolAdapter } from '../common/zerolendBasePoolAdapter.js'

export class ZeroLendVariableDebtTokenPoolAdapter extends ZeroLendBasePoolAdapter {
  productId = 'variable-debt-token'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'ZeroLend VariableDebtToken', // TODO change
      description: 'ZeroLend defi adapter for variable interest-accruing token', // TODO change
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
    return reserveTokenAddresses.variableDebtTokenAddress
  }

  protected getReserveTokenRate(
    reserveData: Awaited<ReturnType<ProtocolDataProvider['getReserveData']>>,
  ): bigint {
    return reserveData.variableBorrowRate
  }
}
