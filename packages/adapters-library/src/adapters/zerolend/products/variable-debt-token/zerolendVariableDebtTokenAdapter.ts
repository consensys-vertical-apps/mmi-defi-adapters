import {
  AdapterSettings,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'
import { ZeroLendBasePoolAdapter } from '../../common/zerolendBasePoolAdapter'
import { ProtocolDataProvider } from '../../contracts'

export class ZeroLendVariableDebtTokenPoolAdapter extends ZeroLendBasePoolAdapter {
  productId = 'variable-debt-token'

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'ZeroLend VariableDebtToken', // TODO change
      description: 'ZeroLend defi adapter for variable interest-accruing token', // TODO change
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
    return reserveTokenAddresses.variableDebtTokenAddress
  }

  protected getReserveTokenRate(
    reserveData: Awaited<ReturnType<ProtocolDataProvider['getReserveData']>>,
  ): bigint {
    return reserveData.variableBorrowRate
  }
}
