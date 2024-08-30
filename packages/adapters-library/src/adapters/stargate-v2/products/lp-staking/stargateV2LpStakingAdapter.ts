import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import { Replacements } from '../../../../scripts/replacements'
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
import { staticChainData } from '../../common/staticChainData'
import {
  StargateMultiRewarder__factory,
  StargatePoolNative__factory,
  StargateStaking__factory,
} from '../../contracts'
import { filterMapAsync, filterMapSync } from '../../../../core/utils/filters'

type AdditionalMetadata = {
  rewarderAddress: string
  rewardTokens: Erc20Metadata[]
}

export class StargateV2LpStakingAdapter implements IProtocolAdapter {
  productId = 'lp-staking'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    version: 2,
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

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'StargateV2',
      description: 'StargateV2 defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const { stargateStakingAddress } = staticChainData[this.chainId]!
    const stakingContract = StargateStaking__factory.connect(
      stargateStakingAddress,
      this.provider,
    )

    const poolAddresses = await stakingContract['tokens()']()

    return await Promise.all(
      poolAddresses.map(async (poolAddress) => {
        const protocolTokenPromise = this.helpers.getTokenMetadata(
          getAddress(poolAddress),
        )

        const rewarderAddress = await stakingContract.rewarder(poolAddress)

        const multiRewarderContract = StargateMultiRewarder__factory.connect(
          rewarderAddress,
          this.provider,
        )

        const rewardTokenAddresses = await multiRewarderContract.rewardTokens()

        return {
          ...(await protocolTokenPromise),
          rewarderAddress,
          rewardTokens: await Promise.all(
            rewardTokenAddresses.map(async (rewardTokenAddress) =>
              this.helpers.getTokenMetadata(getAddress(rewardTokenAddress)),
            ),
          ),
        }
      }),
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

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const { stargateStakingAddress } = staticChainData[this.chainId]!
    const protocolTokens = await this.getProtocolTokens()

    return await filterMapAsync(protocolTokens, async (protocolToken) => {
      if (
        protocolTokenAddresses &&
        !protocolTokenAddresses.includes(protocolToken.address)
      ) {
        return undefined
      }

      const lpStakingContract = StargateStaking__factory.connect(
        stargateStakingAddress,
        this.provider,
      )

      const amount = await lpStakingContract.balanceOf(
        protocolToken.address,
        userAddress,
        {
          blockTag: blockNumber,
        },
      )

      if (!amount) {
        return undefined
      }

      return {
        type: TokenType.Protocol,
        address: protocolToken.address,
        symbol: protocolToken.symbol,
        name: protocolToken.name,
        decimals: protocolToken.decimals,
        balanceRaw: amount,
      }
    })
  }

  async getRewardPositions({
    userAddress,
    blockNumber,
    protocolTokenAddress,
  }: GetRewardPositionsInput): Promise<UnderlyingReward[]> {
    const { rewardTokens, rewarderAddress } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    const rewarderContract = StargateMultiRewarder__factory.connect(
      rewarderAddress,
      this.provider,
    )

    const [rewardTokenAddresses, rewardAmounts] =
      await rewarderContract.getRewards(protocolTokenAddress, userAddress, {
        blockTag: blockNumber,
      })

    return filterMapSync(rewardTokenAddresses, (rewardTokenAddress, i) => {
      const rewardAmount = rewardAmounts[i]!

      if (!rewardAmount) {
        return undefined
      }

      const rewardToken = rewardTokens.find(
        (rt) => rt.address === rewardTokenAddress,
      )

      if (!rewardToken) {
        throw Error('Missing reward token from Metadata')
      }

      return {
        ...rewardToken,
        type: TokenType.UnderlyingClaimable,
        balanceRaw: rewardAmount,
      }
    })
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
    const protocolTokens = await this.getProtocolTokens()

    return await this.helpers.tvl({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
