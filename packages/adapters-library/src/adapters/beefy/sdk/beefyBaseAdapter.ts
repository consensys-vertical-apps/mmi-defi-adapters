import { AdaptersController } from '../../../core/adaptersController'
import { Chain } from '../../../core/constants/chains'
import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../core/utils/logger'
import { Helpers } from '../../../scripts/helpers'
import {
  GetEventsInput,
  GetPositionsInput,
  GetRewardPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  UnderlyingReward,
} from '../../../types/adapter'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import { Protocol } from '../../protocols'

export abstract class BeefyBaseAdapter<
  MetadataEntry extends { protocolToken: Erc20Metadata },
  Metadata extends Record<string, MetadataEntry> = Record<
    string,
    MetadataEntry
  >,
> {
  productId = '' // Overwritten in child classes
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  protected provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
    helpers,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
    this.helpers = helpers
  }

  /**
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Beefy',
      description: 'Beefy defi adapter',
      siteUrl: 'https://beefy.com',
      iconUrl: 'https://beefy.com/icons/icon-96x96.png',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  abstract buildMetadata(): Promise<Metadata>

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    const metadata = await this.buildMetadata()
    return Object.values(metadata).map(({ protocolToken }) => protocolToken)
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const metadata = await this.fetchPoolMetadata(protocolTokenAddress)
    return this.helpers.withdrawals({
      protocolToken: await this.getProtocolToken(
        metadata.protocolToken.address,
      ),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const metadata = await this.fetchPoolMetadata(protocolTokenAddress)
    return this.helpers.deposits({
      protocolToken: await this.getProtocolToken(
        metadata.protocolToken.address,
      ),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()

    return await this.helpers.tvl({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
  }

  protected async getProtocolToken(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).protocolToken
  }

  protected async fetchPoolMetadata(protocolTokenAddress: string) {
    const metadata = await this.buildMetadata()
    const poolMetadata = metadata?.[protocolTokenAddress] ?? null

    if (!poolMetadata) {
      logger.error(
        {
          productId: this.productId,
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

  async getRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
    tokenId,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    // boosts not supported yet
    return []
  }

  async getRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    // boosts not supported yet
    return []
  }

  async getExtraRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
    tokenId,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    // boosts not supported yet
    return []
  }

  async getExtraRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    // boosts not supported yet
    return []
  }
}
