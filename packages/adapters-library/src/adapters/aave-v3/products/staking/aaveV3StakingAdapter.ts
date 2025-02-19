import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
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
import { StakeToken__factory } from '../../contracts'
import { AAVE_ICON_URL } from '../rewards/aaveV3RewardsAdapter'

type AdditionalMetadata = {
  rewardTokens: Erc20Metadata[]
}

export class AaveV3StakingAdapter implements IProtocolAdapter {
  productId = 'staking'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: {
      topic0:
        '0x6c86f3fd5118b3aa8bb4f389a617046de0a3d3d477de1a1673d227f802f616dc',
      userAddressIndex: 2,
    },
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

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Aave v3 Staking',
      description: 'AaveV3 defi adapter for Safety Module staking',
      siteUrl: 'https://app.aave.com/staking/',
      iconUrl: AAVE_ICON_URL,
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const protocolTokens = await Promise.all(
      [
        '0x4da27a545c0c5B758a6BA100e3a049001de870f5', // stkAAVE
        '0x1a88Df1cFe15Af22B3c4c783D4e6F7F9e0C1885d', // stkGHO
        '0x9eDA81C21C273a82BE9Bbc19B6A6182212068101', // stkAAVEwstETHBPTv2
      ].map(async (address) => this.helpers.getTokenMetadata(address)),
    )

    return await Promise.all(
      protocolTokens.map(async (protocolToken) => {
        const stakeToken = StakeToken__factory.connect(
          protocolToken.address,
          this.provider,
        )

        const [underlyingTokenAddress, rewardTokenAddress] = await Promise.all([
          stakeToken.STAKED_TOKEN(),
          stakeToken.REWARD_TOKEN(),
        ])

        const [underlyingToken, rewardToken] = await Promise.all([
          this.helpers.getTokenMetadata(underlyingTokenAddress),
          this.helpers.getTokenMetadata(rewardTokenAddress),
        ])

        return {
          ...protocolToken,
          underlyingTokens: [underlyingToken],
          rewardTokens: [rewardToken],
        }
      }),
    )
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

  async getRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const protocolToken = this.helpers.getProtocolTokenByAddress({
      protocolTokenAddress,
      protocolTokens: await this.getProtocolTokens(),
    })

    if (!protocolToken.rewardTokens) {
      return []
    }

    return await filterMapAsync(
      protocolToken.rewardTokens,
      async (rewardTokenMetadata) => {
        const stakeToken = StakeToken__factory.connect(
          protocolToken.address,
          this.provider,
        )

        const rewardBalance = await stakeToken.getTotalRewardsBalance(
          userAddress,
          {
            blockTag: blockNumber,
          },
        )

        if (rewardBalance === 0n) {
          return undefined
        }

        return {
          ...rewardTokenMetadata,
          type: TokenType.UnderlyingClaimable,
          balanceRaw: rewardBalance,
        }
      },
    )
  }

  async unwrap({
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    return this.helpers.unwrapOneToOne({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      underlyingTokens: (
        await this.getProtocolTokenByAddress(protocolTokenAddress)
      ).underlyingTokens,
    })
  }
}
