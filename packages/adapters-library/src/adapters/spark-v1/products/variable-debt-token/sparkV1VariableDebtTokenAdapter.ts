import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import {
  AssetType,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'
import { SparkV1BasePoolAdapter } from '../../common/SparkV1BasePoolAdapter'

import { ProtocolDataProvider } from '../../contracts'

export class SparkV1VariableDebtTokenPoolAdapter extends SparkV1BasePoolAdapter {
  productId = 'variable-debt-token'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
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

  @CacheToFile({ fileKey: 'variable-debt-token-v1' })
  async buildMetadata() {
    return super.buildMetadata()
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
