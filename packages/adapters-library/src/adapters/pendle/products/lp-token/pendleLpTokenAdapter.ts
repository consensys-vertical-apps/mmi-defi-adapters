import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
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
import { Protocol } from '../../../protocols'
import { fetchAllMarkets } from '../../backend/backendSdk'
import { PENDLE_ROUTER_STATIC_CONTRACT } from '../../backend/constants'
import {
  LiquidityProviderToken__factory,
  RouterStatic__factory,
} from '../../contracts'
import { TrustWalletProtocolIconMap } from '../../../../core/utils/buildIconUrl'

type AdditionalMetadata = {
  marketAddress: string
}

export class PendleLpTokenAdapter implements IProtocolAdapter {
  productId = 'lp-token'
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
      name: 'Pendle',
      description: 'Pendle defi adapter',
      siteUrl: 'https:',
      iconUrl: TrustWalletProtocolIconMap[Protocol.Pendle],
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const resp = await fetchAllMarkets(this.chainId)

    return await Promise.all(
      resp.results.map(async (value) => {
        const marketAddress = getAddress(value.address)

        const [lp, underlyingAsset] = await Promise.all([
          this.helpers.getTokenMetadata(value.lp.address),
          this.helpers.getTokenMetadata(value.underlyingAsset.address),
        ])

        return {
          ...lp,
          underlyingTokens: [underlyingAsset],
          marketAddress,
        }
      }),
    )
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  async unwrap({
    blockNumber,
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const {
      underlyingTokens: [underlyingToken],
      marketAddress,
      ...protocolToken
    } = await this.getProtocolTokenByAddress(protocolTokenAddress)

    const oracle = RouterStatic__factory.connect(
      PENDLE_ROUTER_STATIC_CONTRACT,
      this.provider,
    )

    // missing block number atm
    const rate = await oracle.getLpToSyRate(marketAddress, {
      blockTag: blockNumber,
    })

    const underlying = {
      type: TokenType.Underlying,

      underlyingRateRaw: rate,
      ...underlyingToken!,
    }

    return {
      baseRate: 1,
      type: TokenType.Protocol,
      ...protocolToken,
      tokens: [underlying],
    }
  }

  async getRewardPositions({
    userAddress,
    protocolTokenAddress,
    blockNumber,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const liquidityProviderTokenContract =
      LiquidityProviderToken__factory.connect(
        protocolTokenAddress,
        this.provider,
      )

    const rewardsOut =
      await liquidityProviderTokenContract.redeemRewards.staticCall(
        userAddress,
        {
          blockTag: blockNumber,
        },
      )

    if (!rewardsOut.length || rewardsOut.every((rewardValue) => !rewardValue)) {
      return []
    }

    const rewardTokenAddresses =
      await liquidityProviderTokenContract.getRewardTokens({
        blockTag: blockNumber,
      })

    return await filterMapAsync(
      rewardTokenAddresses,
      async (rewardTokenAddress, i) => {
        const rewardBalance = rewardsOut[i]
        if (!rewardBalance) {
          return undefined
        }

        const rewardTokenMetadata = await getTokenMetadata(
          rewardTokenAddress,
          this.chainId,
          this.provider,
        )

        return {
          ...rewardTokenMetadata,
          type: TokenType.UnderlyingClaimable,
          balanceRaw: rewardBalance,
        }
      },
    )
  }

  private async getProtocolTokenByAddress(
    protocolTokenAddress: string,
  ): Promise<ProtocolToken<AdditionalMetadata>> {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }
}
