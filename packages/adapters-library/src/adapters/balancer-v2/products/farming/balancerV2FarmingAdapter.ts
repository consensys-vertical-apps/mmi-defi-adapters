import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../../core/utils/logger'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetPositionsInput,
  GetRewardPositionsInput,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  TokenType,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import {
  BalMinter__factory,
  FarmingToken__factory,
  Farming__factory,
} from '../../contracts'

type AdditionalMetadata = {
  rewardTokens: Erc20Metadata[]
}

export class BalancerV2FarmingAdapter implements IProtocolAdapter {
  productId = 'farming'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  private provider: CustomJsonRpcProvider

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
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'BalancerV2',
      description: 'BalancerV2 defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const farmingAddress = '0xC128468b7Ce63eA702C1f104D55A2566b13D3ABD'
    const balancerToken = await this.helpers.getTokenMetadata(
      '0xba100000625a3754423978a60c9317c58a424e3d',
    )

    const farmingContract = Farming__factory.connect(
      farmingAddress,
      this.provider,
    )

    const count = await farmingContract.n_gauges()

    const protocolTokens: ProtocolToken<AdditionalMetadata>[] = []

    await Promise.all(
      Array.from({ length: Number(count) }, async (_, i) => {
        try {
          const gaugeAddress = await farmingContract.gauges(i)
          const gaugeContract = FarmingToken__factory.connect(
            gaugeAddress,
            this.provider,
          )

          const protocolToken =
            await this.helpers.getTokenMetadata(gaugeAddress)
          const underlyingTokenAddress = await gaugeContract.lp_token()
          const underlyingToken = await this.helpers.getTokenMetadata(
            underlyingTokenAddress,
          )
          protocolTokens.push({
            ...protocolToken,
            underlyingTokens: [underlyingToken],
            rewardTokens: [balancerToken],
          })
        } catch (error) {
          logger.debug(
            `Failed to process gauge at index ${i}: ${
              (error as Error).message
            }`,
          )
        }
      }),
    )

    return protocolTokens
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    return this.helpers.unwrapOneToOne({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      underlyingTokens: (
        await this.getProtocolTokenByAddress(protocolTokenAddress)
      ).underlyingTokens,
    })
  }

  async getRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
    tokenId,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const balancerMinter = BalMinter__factory.connect(
      '0x239e55F427D44C3cc793f49bFB507ebe76638a2b',
      this.provider,
    )

    const { rewardTokens } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    if (!rewardTokens || rewardTokens.length === 0) {
      return []
    }

    const balanceRaw = await balancerMinter.mint.staticCall(
      protocolTokenAddress,
      { blockTag: blockNumber, from: userAddress },
    )

    return [
      { ...rewardTokens[0]!, balanceRaw, type: TokenType.UnderlyingClaimable },
    ]
  }
}
