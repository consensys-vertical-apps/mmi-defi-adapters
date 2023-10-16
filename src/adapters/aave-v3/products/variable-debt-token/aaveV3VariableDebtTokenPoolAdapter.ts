import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'
import { AaveBasePoolAdapter } from '../../../aave-v2/common/aaveBasePoolAdapter'
import { ProtocolDataProvider } from '../../../aave-v2/contracts'

export class AaveV3VariableDebtTokenPoolAdapter extends AaveBasePoolAdapter {
  product = 'variable-debt-token'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Aave v3 VariableDebtToken',
      description: 'Aave v3 defi adapter for variable interest-accruing token',
      siteUrl: 'https://aave.com/',
      iconUrl: 'https://aave.com/favicon.ico',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
      product: this.product,
    }
  }

  @CacheToFile({ fileKey: 'variable-debt-token-v3' })
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
