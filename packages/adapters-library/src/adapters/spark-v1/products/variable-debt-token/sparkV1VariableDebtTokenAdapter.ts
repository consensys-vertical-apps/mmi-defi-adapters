import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import {
  type AdapterSettings,
  PositionType,
  type ProtocolDetails,
} from '../../../../types/adapter.js'
import { SparkV1BasePoolAdapter } from '../../common/SparkV1BasePoolAdapter.js'

import type { ProtocolDataProvider } from '../../contracts/index.js'

export class SparkV1VariableDebtTokenPoolAdapter extends SparkV1BasePoolAdapter {
  productId = 'variable-debt-token'

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Spark V1 VariableDebtToken',
      description: 'Spark v1 defi adapter for variable interest-accruing token',
      siteUrl: 'https://spark.fi',
      iconUrl:
        'https://github.com/marsfoundation/spark-app/blob/main/packages/app/public/favicon.ico',
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
