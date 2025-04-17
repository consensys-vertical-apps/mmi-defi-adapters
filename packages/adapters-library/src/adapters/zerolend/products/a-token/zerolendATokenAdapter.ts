import { Chain } from '../../../../core/constants/chains'
import {
  AdapterSettings,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'

import { Protocol } from '../../../protocols'

import { ZeroLendBasePoolAdapter } from '../../common/zerolendBasePoolAdapter'
import { PoolContract__factory, ProtocolDataProvider } from '../../contracts'

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
      iconUrl: 'https://zerolend.xyz/favicon.ico',
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
