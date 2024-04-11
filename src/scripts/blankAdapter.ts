import { GetTransactionParams } from '../adapters'
import { Protocol } from '../adapters/protocols'
import { AdaptersController } from '../core/adaptersController'
import { Chain } from '../core/constants/chains'
import { IMetadataBuilder, CacheToFile } from '../core/decorators/cacheToFile'
import { NotImplementedError } from '../core/errors/errors'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { IProtocolAdapter } from '../types/IProtocolAdapter'
import {
  ProtocolAdapterParams,
  ProtocolDetails,
  PositionType,
  AssetType,
  GetPositionsInput,
  ProtocolPosition,
  GetEventsInput,
  MovementsByBlock,
  GetTotalValueLockedInput,
  ProtocolTokenTvl,
  UnwrapInput,
  UnwrapExchangeRate,
} from '../types/adapter'
import { Erc20Metadata } from '../types/erc20Metadata'

export class adapterClassNameAdapter
  implements IProtocolAdapter, IMetadataBuilder
{
  productId = '{{productId}}'
  protocolId: Protocol
  chainId: Chain

  private provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
  }

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: '{{appName}}',
      description: '{{appName}} defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.NonStandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return '{{buildMetadata}}' as any
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return '{{getProtocolTokens}}' as any
  }

  async getPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return '{{getPositions}}' as any
  }

  async getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return '{{getWithdrawals}}' as any
  }

  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return '{{getDeposits}}' as any
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    return '{{getTotalValueLocked}}' as any
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    return '{{unwrap}}' as any
  }
}
