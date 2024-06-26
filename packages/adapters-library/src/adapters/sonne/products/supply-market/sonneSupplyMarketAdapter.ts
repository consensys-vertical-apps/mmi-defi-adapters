import { CompoundV2SupplyMarketForkAdapter } from '../../../../core/adapters/CompoundV2SupplyMarketForkAdapter'
import { Chain } from '../../../../core/constants/chains'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import {
  AssetType,
  PositionType,
  ProtocolDetails,
} from '../../../../types/adapter'

export class SonneSupplyMarketAdapter extends CompoundV2SupplyMarketForkAdapter {
  productId = 'supply-market'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  contractAddresses: Partial<Record<Chain, { comptrollerAddress: string }>> = {
    [Chain.Optimism]: {
      comptrollerAddress: '0x60CF091cD3f50420d50fD7f707414d0DF4751C58',
    },
    [Chain.Base]: {
      comptrollerAddress: '0x1DB2466d9F5e10D7090E7152B68d62703a2245F0',
    },
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Sonne',
      description: 'Sonne supply market adapter',
      siteUrl: '',
      iconUrl: '',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return await super.buildMetadata()
  }
}
