import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
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
import { RewardRouter__factory, RewardTracker__factory } from '../../contracts'
import { filterMapAsync } from '../../../../core/utils/filters'
import { contractAddresses } from '../../common/contractAddresses'

type RewardTokenMetadata = Erc20Metadata & {
  rewardTrackerAddress: string
}

type AdditionalMetadata = {
  positionContractAddress: string
  rewardTokens: RewardTokenMetadata[]
}

export class GmxFarmingAdapter implements IProtocolAdapter {
  productId = 'farming'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
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
      description: 'GMX Farming',
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

    const [
      gmxAddress,
      esGmxAddress,
      stakedGmxTrackerAddress,
      feeGmxTrackerAddress,
      bonusGmxTrackerAddress,
      extendedGmxTrackerAddress,
    ] = await Promise.all([
      rewardRouter.gmx(),
      rewardRouter.esGmx(),
      rewardRouter.stakedGmxTracker(),
      rewardRouter.feeGmxTracker(),
      rewardRouter.bonusGmxTracker(),
      rewardRouter.extendedGmxTracker(),
    ])

    const [gmxMetadata, esGmxMetadata] = await Promise.all([
      this.helpers.getTokenMetadata(gmxAddress),
      this.helpers.getTokenMetadata(esGmxAddress),
    ])

    const gmxRewardTokens = await Promise.all(
      [
        stakedGmxTrackerAddress,
        feeGmxTrackerAddress,
        bonusGmxTrackerAddress,
        extendedGmxTrackerAddress,
      ].map(async (trackerAddress) => {
        const trackerContract = RewardTracker__factory.connect(
          trackerAddress,
          this.provider,
        )

        const rewardTokenMetadata = await this.helpers.getTokenMetadata(
          await trackerContract.rewardToken(),
        )

        return {
          ...rewardTokenMetadata,
          rewardTrackerAddress: trackerAddress,
        }
      }),
    )

    return [
      {
        ...gmxMetadata,
        positionContractAddress: stakedGmxTrackerAddress,
        underlyingTokens: [],
        rewardTokens: gmxRewardTokens,
      },
      {
        ...esGmxMetadata,
        positionContractAddress: stakedGmxTrackerAddress,
        underlyingTokens: [],
        rewardTokens: [],
      },
    ]
  }

  async getPositions({
    userAddress,
    protocolTokenAddresses,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    return await filterMapAsync(
      await this.getProtocolTokens(),
      async (protocolToken) => {
        if (
          protocolTokenAddresses &&
          !protocolTokenAddresses.includes(protocolToken.address)
        ) {
          return undefined
        }

        const stakedRewardTraker = RewardTracker__factory.connect(
          protocolToken.positionContractAddress,
          this.provider,
        )

        const amountStaked = await stakedRewardTraker.depositBalances(
          userAddress,
          protocolToken.address,
          { blockTag: blockNumber },
        )

        if (amountStaked === 0n) {
          return undefined
        }

        return {
          address: protocolToken.address,
          name: `Staked ${protocolToken.name}`,
          symbol: protocolToken.symbol,
          decimals: protocolToken.decimals,
          balanceRaw: 0n,
          type: TokenType.Protocol, // TODO Should be a contract position
          tokens: [
            {
              address: protocolToken.address,
              name: protocolToken.name,
              symbol: protocolToken.symbol,
              decimals: protocolToken.decimals,
              balanceRaw: amountStaked,
              type: TokenType.Underlying,
            },
          ],
        }
      },
    )
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
      async ({ rewardTrackerAddress, ...rewardTokenMetadata }) => {
        const rewardTracker = RewardTracker__factory.connect(
          rewardTrackerAddress,
          this.provider,
        )

        const rewardBalance = await rewardTracker.claimable(userAddress, {
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

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
