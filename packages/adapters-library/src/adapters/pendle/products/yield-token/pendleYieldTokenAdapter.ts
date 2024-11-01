import { Block, getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync, filterMapSync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
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
  TokenType,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { fetchAllMarkets } from '../../backend/backendSdk'
import { PENDLE_ROUTER_STATIC_CONTRACT } from '../../backend/constants'
import { RouterStatic__factory, YieldToken__factory } from '../../contracts'

type AdditionalMetadata = {
  marketAddress: string
  expiry: string
}

export class PendleYieldTokenAdapter implements IProtocolAdapter {
  productId = 'yield-token'
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
      description: 'Pendle Market adapter',
      siteUrl: 'https://www.pendle.finance',
      iconUrl: 'https://app.pendle.finance/favicon.ico',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  async isExpiredAtBlock(
    expiry: string,
    blockNumber?: number,
  ): Promise<boolean> {
    let comparisonDate: Date

    if (blockNumber) {
      // Get the block details if a block number is provided
      const block = await this.provider.getBlock(blockNumber)

      if (!block) {
        throw new Error(`Block ${blockNumber} not found`)
      }

      comparisonDate = new Date(block.timestamp * 1000) // Convert seconds to milliseconds
    } else {
      // If no block number is provided, use today's date
      comparisonDate = new Date()
    }

    const expiryDate = new Date(expiry)

    // Compare the expiry date with either the block date or today's date
    return comparisonDate > expiryDate
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const resp = await fetchAllMarkets(this.chainId)

    return await Promise.all(
      resp.results.map(async (value) => {
        const marketAddress = getAddress(value.address)

        const [yt, sy] = await Promise.all([
          this.helpers.getTokenMetadata(value.yt.address),
          this.helpers.getTokenMetadata(value.sy.address), // TODO: Check if decimals need to be underlyingAsset.decimals
        ])

        return {
          ...yt,
          underlyingTokens: [sy],
          marketAddress,
          expiry: value.expiry,
        }
      }),
    )
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const tokens = await filterMapAsync(
      await this.getProtocolTokens(),
      async (protocolToken) => {
        if (await this.isExpiredAtBlock(protocolToken.expiry)) {
          return undefined
        }

        return protocolToken
      },
    )

    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: tokens,
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

    // this function was deployed around blockNumber 20418316
    const rate = await oracle.getYtToSyRate(marketAddress, {
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
    const yieldTokenContract = YieldToken__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const { interestOut, rewardsOut } =
      await yieldTokenContract.redeemDueInterestAndRewards.staticCall(
        userAddress,
        true,
        true,
        { blockTag: blockNumber },
      )

    const rewards: UnderlyingReward[] = []
    if (interestOut) {
      const {
        underlyingTokens: [underlyingToken],
      } = await this.getProtocolTokenByAddress(protocolTokenAddress)

      rewards.push({
        ...underlyingToken!,
        type: TokenType.UnderlyingClaimable,
        balanceRaw: interestOut,
      })
    }

    if (rewardsOut.length) {
      const rewardTokenAddresses = await yieldTokenContract.getRewardTokens({
        blockTag: blockNumber,
      })

      rewards.push(
        ...(await filterMapAsync(
          rewardTokenAddresses,
          async (rewardTokenAddress, i) => {
            const rewardBalance = rewardsOut[i]
            if (!rewardBalance) {
              return undefined
            }

            return {
              ...(await getTokenMetadata(
                rewardTokenAddress,
                this.chainId,
                this.provider,
              )),
              type: TokenType.UnderlyingClaimable,
              balanceRaw: rewardBalance,
            }
          },
        )),
      )
    }

    return rewards
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
