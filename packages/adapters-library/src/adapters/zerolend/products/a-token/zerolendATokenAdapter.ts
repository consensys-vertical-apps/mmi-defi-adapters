import {
  type AdapterSettings,
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'

import { ZeroLendBasePoolAdapter } from '../../common/zerolendBasePoolAdapter.js'
import type { ProtocolDataProvider } from '../../contracts/index.js'

export class ZeroLendATokenPoolAdapter extends ZeroLendBasePoolAdapter {
  productId = 'a-token'

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'ZeroLend AToken', // todo change
      description: 'ZeroLend defi adapter for yield-generating token', // todo change
      siteUrl: 'https://app.zerolend.xyz/',
      iconUrl: 'https://app.zerolend.xyz/favicon.ico',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  protected getReserveTokenAddress(
    reserveTokenAddresses: Awaited<
      ReturnType<ProtocolDataProvider['getReserveTokensAddresses']>
    >,
  ): string {
    return reserveTokenAddresses.aTokenAddress
  }

  protected getReserveTokenRate(
    reserveData: Awaited<ReturnType<ProtocolDataProvider['getReserveData']>>,
  ): bigint {
    return reserveData.liquidityRate
  }
}
