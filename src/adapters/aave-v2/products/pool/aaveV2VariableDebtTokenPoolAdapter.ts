import { ethers } from 'ethers'
import { Protocol } from '../../..'
import { Chain } from '../../../../core/constants/chains'
import { PositionType, ProtocolDetails } from '../../../../types/adapter'
import { fetchAaveV2VariableDebtTokenMetadata } from '../../aaveV2MetadataFetcher'
import { AaveV2BasePoolAdapter } from './aaveV2BasePoolAdapter'

export class AaveV2VariableDebtTokenPoolAdapter extends AaveV2BasePoolAdapter {
  constructor({
    provider,
    chainId,
  }: {
    provider: ethers.providers.StaticJsonRpcProvider
    chainId: Chain
  }) {
    super({
      provider,
      chainId,
      metadata: fetchAaveV2VariableDebtTokenMetadata(chainId),
    })
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: Protocol.AaveV2,
      name: 'Aave v2 VariableDebtToken',
      description: 'Aave v2 defi adapter for variable interest-accruing token',
      siteUrl: 'https://aave.com/',
      iconUrl: 'https://aave.com/favicon.ico',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
    }
  }
}
