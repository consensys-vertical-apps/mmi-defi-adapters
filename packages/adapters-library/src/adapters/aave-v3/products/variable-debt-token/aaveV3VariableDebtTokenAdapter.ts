import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import {
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'
import { AaveBasePoolAdapter } from '../../../aave-v2/common/aaveBasePoolAdapter.js'
import type { ProtocolDataProvider } from '../../../aave-v2/contracts/index.js'
import { AAVE_ICON_URL } from '../rewards/aaveV3RewardsAdapter.js'

export class AaveV3VariableDebtTokenPoolAdapter extends AaveBasePoolAdapter {
  productId = 'variable-debt-token'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Aave v3 VariableDebtToken',
      description: 'Aave v3 defi adapter for variable interest-accruing token',
      siteUrl: 'https://aave.com/',
      iconUrl: AAVE_ICON_URL,
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
    return reserveTokenAddresses.variableDebtTokenAddress
  }

  protected getReserveTokenRate(
    reserveData: Awaited<ReturnType<ProtocolDataProvider['getReserveData']>>,
  ): bigint {
    return reserveData.variableBorrowRate
  }
}
