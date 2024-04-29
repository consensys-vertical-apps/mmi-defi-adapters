import { getAddress } from 'ethers'
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
import { helpers } from '../../../../core/adapters/helpers'
import { RewardsAdapter } from '../../../../core/adapters/rewardAdapter'
import { NotImplementedError } from '../../../../core/errors/errors'
import { ReplacementPlaceholder } from '../../../../core/adapters/replacementPlaceholder'

type Metadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
  }
>

export class ADAPTER_CLASS_NAME implements IProtocolAdapter, IMetadataBuilder {
  productId = 'ReplacementPlaceholder.PRODUCT_ID'
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
      name: 'ReplacementPlaceholder.PROTOCOL_KEY',
      description: 'ReplacementPlaceholder.PROTOCOL_KEY defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: ReplacementPlaceholder.ASSET_TYPE,
      },
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata(): Promise<Metadata> {
    return ReplacementPlaceholder.BUILD_METADATA
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return ReplacementPlaceholder.GET_PROTOCOL_TOKENS
  }

  async getPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return ReplacementPlaceholder.GET_POSITIONS
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return ReplacementPlaceholder.GET_WITHDRAWALS
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return ReplacementPlaceholder.GET_DEPOSITS
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    return ReplacementPlaceholder.UNWRAP
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

  //ReplacementPlaceholder.GET_REWARD_POSITIONS

  //ReplacementPlaceholder.GET_REWARD_WITHDRAWALS
}
