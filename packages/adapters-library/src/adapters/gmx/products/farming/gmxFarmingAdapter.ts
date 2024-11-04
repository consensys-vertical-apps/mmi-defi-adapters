import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  GetRewardPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  MovementsByBlockReward,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  Underlying,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import {
  RewardReader__factory,
  RewardRouter__factory,
  RewardTracker__factory,
} from '../../contracts'
import { filterMapAsync } from '../../../../core/utils/filters'

type RewardTokenMetadata = Erc20Metadata & {
  rewardTracker: string
}

type AdditionalMetadata = {
  rewardTokens: RewardTokenMetadata[]
  stakedTokenTrackerAddress: string
}

const contractAddresses: Partial<
  Record<
    Chain,
    { rewardRouter: string; glpRewardRouter: string; rewardReader: string }
  >
> = {
  [Chain.Arbitrum]: {
    rewardRouter: '0x5e4766f932ce00aa4a1a82d3da85adf15c5694a1',
    glpRewardRouter: '0xB95DB5B167D75e6d04227CfFFA61069348d271F5',
    rewardReader: '0x8BFb8e82Ee4569aee78D03235ff465Bd436D40E0',
  },
  [Chain.Avalanche]: {
    rewardRouter: '0x091eD806490Cc58Fd514441499e58984cCce0630',
    glpRewardRouter: '0xB70B91CE0771d3f4c81D87660f71Da31d48eB3B3',
    rewardReader: '0x04Fc11Bd28763872d143637a7c768bD96E44c1b6',
  },
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
    // GMX Farming
    // esGMX Farming
    const rewardRouter = RewardRouter__factory.connect(
      contractAddresses[this.chainId]!.rewardRouter,
      this.provider,
    )

    const [
      gmxMetadata,
      esGmxMetadata,
      stakedGmxTrackerAddress,
      feeGmxTrackerAddress,
      bonusGmxTrackerAddress,
      extendedGmxTrackerAddress,
    ] = await Promise.all([
      this.helpers.getTokenMetadata(await rewardRouter.gmx()),
      this.helpers.getTokenMetadata(await rewardRouter.esGmx()),
      rewardRouter.stakedGmxTracker(),
      rewardRouter.feeGmxTracker(),
      rewardRouter.bonusGmxTracker(),
      rewardRouter.extendedGmxTracker(),
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

        return {
          ...(await this.helpers.getTokenMetadata(
            await trackerContract.rewardToken(),
          )),
          rewardTracker: trackerAddress,
        }
      }),
    )

    // GLP Farming
    const glpRewardRouter = RewardRouter__factory.connect(
      contractAddresses[this.chainId]!.glpRewardRouter,
      this.provider,
    )

    const [glpMetadata, stakedGlpTrackerAddress, feeGlpTrackerAddress] =
      await Promise.all([
        this.helpers.getTokenMetadata(await glpRewardRouter.glp()),
        glpRewardRouter.stakedGlpTracker(),
        glpRewardRouter.feeGlpTracker(),
      ])

    const glpRewardTokens = await Promise.all(
      [stakedGlpTrackerAddress, feeGlpTrackerAddress].map(
        async (trackerAddress) => {
          const trackerContract = RewardTracker__factory.connect(
            trackerAddress,
            this.provider,
          )

          return {
            ...(await this.helpers.getTokenMetadata(
              await trackerContract.rewardToken(),
            )),
            rewardTracker: trackerAddress,
          }
        },
      ),
    )

    return [
      {
        ...gmxMetadata,
        stakedTokenTrackerAddress: stakedGmxTrackerAddress,
        underlyingTokens: [],
        rewardTokens: gmxRewardTokens,
      },
      {
        ...esGmxMetadata,
        stakedTokenTrackerAddress: stakedGmxTrackerAddress,
        underlyingTokens: [],
        rewardTokens: gmxRewardTokens,
      },
      {
        ...glpMetadata,
        stakedTokenTrackerAddress: stakedGlpTrackerAddress,
        underlyingTokens: [],
        rewardTokens: glpRewardTokens,
      },
    ]
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }

  // When GMX or esGMX is staked, the following stakes happen internally
  // IRewardTracker(stakedGmxTracker).stakeForAccount(_fundingAccount, _account, _token, _amount);
  // IRewardTracker(bonusGmxTracker).stakeForAccount(_account, _account, stakedGmxTracker, _amount);
  // IRewardTracker(extendedGmxTracker).stakeForAccount(_account, _account, bonusGmxTracker, _amount);
  // IRewardTracker(feeGmxTracker).stakeForAccount(_account, _account, extendedGmxTracker, _amount);

  // When GLP is stakes, the following stakes happen internally
  // IRewardTracker(feeGlpTracker).stakeForAccount(account, account, glp, glpAmount);
  // IRewardTracker(stakedGlpTracker).stakeForAccount(account, account, feeGlpTracker, glpAmount);
  async getPositions({
    userAddress,
    protocolTokenAddresses,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const rewardReader = RewardReader__factory.connect(
      contractAddresses[this.chainId]!.rewardReader,
      this.provider,
    )

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
          protocolToken.stakedTokenTrackerAddress,
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
          name: protocolToken.name,
          symbol: protocolToken.symbol,
          decimals: protocolToken.decimals,
          balanceRaw: amountStaked,
          type: TokenType.Protocol,
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
