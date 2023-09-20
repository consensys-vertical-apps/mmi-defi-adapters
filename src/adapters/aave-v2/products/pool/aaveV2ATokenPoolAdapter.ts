import { Adapter } from '../../../../core/decorators/adapter'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'
import { ProtocolDataProvider } from '../../contracts'
import { AaveV2BasePoolAdapter } from './aaveV2BasePoolAdapter'

@Adapter
export class AaveV2ATokenPoolAdapter extends AaveV2BasePoolAdapter {
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Aave v2 AToken',
      description: 'Aave v2 defi adapter for yield-generating token',
      siteUrl: 'https://aave.com/',
      iconUrl: 'https://aave.com/favicon.ico',
      positionType: PositionType.Lend,
      chainId: this.chainId,
    }
  }

  @CacheToFile({ fileKey: 'a-token' })
  async buildMetadata() {
    return super.buildMetadata()
  }

  protected getReserveTokenAddress(
    reserveTokenAddresses: Awaited<
      ReturnType<ProtocolDataProvider['getReserveTokensAddresses']>
    >,
  ): string {
    return reserveTokenAddresses.aTokenAddress
  }
}
