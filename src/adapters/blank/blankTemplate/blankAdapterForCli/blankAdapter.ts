import { Protocol } from '../../../protocols'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../../core/utils/logger'
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
  Underlying,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { helpers } from '../../../../scripts/helpers'
import { RewardsAdapter } from '../../../../scripts/rewardAdapter'
import { NotImplementedError } from '../../../../core/errors/errors'

type Metadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
  }
>

export class adapterClassName implements IProtocolAdapter, IMetadataBuilder {
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
      name: '{{protocolKey}}',
      description: '{{protocolKey}} defi adapter',
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
  async buildMetadata(): Promise<Metadata> {
    return '{{buildMetadata}}' as unknown as Metadata
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return '{{getProtocolTokens}}' as any
  }

  async getPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return '{{getPositions}}' as any
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return '{{getWithdrawals}}' as any
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return '{{getDeposits}}' as any
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    return '{{unwrap}}' as any
  }

  private async getProtocolToken(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).protocolToken
  }
  private async getUnderlyingTokens(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).underlyingTokens
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error(
        {
          protocolTokenAddress,
          protocol: this.protocolId,
          chainId: this.chainId,
          product: this.productId,
        },
        'Protocol token pool not found',
      )
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

  //getRewardPositions

  //getRewardWithdrawals
}
