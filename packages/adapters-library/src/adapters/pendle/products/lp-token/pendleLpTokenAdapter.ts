import { getAddress } from 'ethers'
import type { AdaptersController } from '../../../../core/adaptersController.js'
import type { Chain } from '../../../../core/constants/chains.js'
import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import type { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider.js'
import { filterMapAsync } from '../../../../core/utils/filters.js'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata.js'
import type { Helpers } from '../../../../scripts/helpers.js'
import type {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter.js'
import {
  type GetEventsInput,
  type GetPositionsInput,
  type GetRewardPositionsInput,
  type GetTotalValueLockedInput,
  type MovementsByBlock,
  PositionType,
  type ProtocolAdapterParams,
  type ProtocolDetails,
  type ProtocolPosition,
  type ProtocolTokenTvl,
  TokenType,
  type UnderlyingReward,
  type UnwrapExchangeRate,
  type UnwrapInput,
} from '../../../../types/adapter.js'
import type { Erc20Metadata } from '../../../../types/erc20Metadata.js'
import type { Protocol } from '../../../protocols.js'
import { fetchAllMarkets } from '../../backend/backendSdk.js'
import { PENDLE_ROUTER_STATIC_CONTRACT } from '../../backend/constants.js'
import {
  LiquidityProviderToken__factory,
  RouterStatic__factory,
} from '../../contracts/index.js'

type AdditionalMetadata = {
  marketAddress: string
}

export class PendleLpTokenAdapter implements IProtocolAdapter {
  productId = 'lp-token'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
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
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const resp = await fetchAllMarkets(this.chainId)

    return resp.results.map((value) => {
      const marketAddress = getAddress(value.address)

      const lp: Erc20Metadata = {
        address: getAddress(value.lp.address),
        name: value.lp.name,
        symbol: value.lp.symbol,
        decimals: value.lp.decimals,
      }
      const underlyingAsset: Erc20Metadata = {
        address: getAddress(value.underlyingAsset.address),
        name: value.underlyingAsset.name,
        symbol: value.underlyingAsset.symbol,
        decimals: value.underlyingAsset.decimals,
      }

      return {
        ...lp,
        underlyingTokens: [underlyingAsset],
        marketAddress,
      }
    })
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
    return this.helpers.withdrawals({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.deposits({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
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
