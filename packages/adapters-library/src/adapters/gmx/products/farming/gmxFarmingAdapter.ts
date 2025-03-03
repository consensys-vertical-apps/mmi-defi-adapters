import type { AdaptersController } from '../../../../core/adaptersController.js'
import type { Chain } from '../../../../core/constants/chains.js'
import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import { NotImplementedError } from '../../../../core/errors/errors.js'
import type { Helpers } from '../../../../core/helpers.js'
import type { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider.js'
import { filterMapAsync } from '../../../../core/utils/filters.js'
import type {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter.js'
import {
  type AdapterSettings,
  type GetPositionsInput,
  type GetRewardPositionsInput,
  PositionType,
  type ProtocolAdapterParams,
  type ProtocolDetails,
  type ProtocolPosition,
  TokenType,
  type UnderlyingReward,
  type UnwrapExchangeRate,
  type UnwrapInput,
} from '../../../../types/adapter.js'
import type { Erc20Metadata } from '../../../../types/erc20Metadata.js'
import type { Protocol } from '../../../protocols.js'
import { contractAddresses } from '../../common/contractAddresses.js'
import {
  RewardRouter__factory,
  RewardTracker__factory,
} from '../../contracts/index.js'

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

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: false,
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

  async unwrap({
    protocolTokenAddress,
    tokenId,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
