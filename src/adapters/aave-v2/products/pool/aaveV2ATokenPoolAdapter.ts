import { Adapter } from '../../../../core/decorators/adapter.js'
import { CacheToFile } from '../../../../core/decorators/cacheToFile.js'
import { PositionType, ProtocolDetails } from '../../../../types/adapter.js'
import { ProtocolDataProvider } from '../../contracts/index.js'
import { AaveV2BasePoolAdapter } from './aaveV2BasePoolAdapter.js'

@Adapter
export class AaveV2ATokenPoolAdapter extends AaveV2BasePoolAdapter {
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Aave v2 AToken',
      description: 'Aave v2 defi adapter for yield-generating token',
      siteUrl: 'https://aave.com/',
      iconUrl: 'https://aave.com/favicon.ico',
      positionType: PositionType.Supply,
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
