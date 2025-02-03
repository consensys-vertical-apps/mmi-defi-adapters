import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'
import { AAVE_ICON_URL } from '../../../aave-v3/products/rewards/aaveV3RewardsAdapter'
import { AaveBasePoolAdapter } from '../../common/aaveBasePoolAdapter'
import { ProtocolDataProvider } from '../../contracts'

export class AaveV2ATokenPoolAdapter extends AaveBasePoolAdapter {
  productId = 'a-token'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Aave v2 AToken',
      description: 'Aave v2 defi adapter for yield-generating token',
      siteUrl: 'https://aave.com/',
      iconUrl: AAVE_ICON_URL,
      positionType: PositionType.Supply,
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
    return reserveTokenAddresses.aTokenAddress
  }

  protected getReserveTokenRate(
    reserveData: Awaited<ReturnType<ProtocolDataProvider['getReserveData']>>,
  ): bigint {
    return reserveData.liquidityRate
  }
}
