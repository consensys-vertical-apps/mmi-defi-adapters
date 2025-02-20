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
import { contractAddresses } from '../../common/contractAddresses'
import { RewardRouter__factory, Vester__factory } from '../../contracts'

type AdditionalMetadata = {
  rewardTokens: Erc20Metadata[]
}

export class GmxVestingAdapter implements IProtocolAdapter {
  productId = 'vesting'
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

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'GMX',
      description: 'GMX Vesting',
      siteUrl: 'https://app.gmx.io',
      iconUrl:
        'https://gmx.io//static/media/ic_gmx_40.72a1053e8344ef876100ac72aff70ead.svg',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const rewardRouter = RewardRouter__factory.connect(
      contractAddresses[this.chainId]!.rewardRouter,
      this.provider,
    )

    const protocolTokens = await Promise.all([
      this.helpers.getTokenMetadata(await rewardRouter.gmxVester()),
      this.helpers.getTokenMetadata(await rewardRouter.glpVester()),
    ])

    return await Promise.all(
      protocolTokens.map(async (protocolToken) => {
        const vester = Vester__factory.connect(
          protocolToken.address,
          this.provider,
        )

        const [underlyingTokenAddress, rewardTokenAddress] = await Promise.all([
          vester.esToken(),
          vester.claimableToken(),
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

  async unwrap({
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const protocolToken =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    return this.helpers.unwrapOneToOne({
      protocolToken: protocolToken,
      underlyingTokens: protocolToken.underlyingTokens,
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

    const vester = Vester__factory.connect(protocolTokenAddress, this.provider)

    return await filterMapAsync(
      protocolToken.rewardTokens,
      async (rewardTokenMetadata) => {
        const rewardBalance = await vester.claimable(userAddress, {
          blockTag: blockNumber,
        })

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
}
