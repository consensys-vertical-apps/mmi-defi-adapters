import { getAddress } from 'ethers'
import type { AdaptersController } from '../../../../core/adaptersController.js'
import type { Chain } from '../../../../core/constants/chains.js'
import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import { NotImplementedError } from '../../../../core/errors/errors.js'
import type { Helpers } from '../../../../core/helpers.js'
import type { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider.js'
import {
  filterMapAsync,
  filterMapSync,
} from '../../../../core/utils/filters.js'
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
import { staticChainDataV2 } from '../../common/staticChainData.js'
import {
  StargateMultiRewarder__factory,
  StargateStaking__factory,
} from '../../contracts/index.js'

type AdditionalMetadata = {
  rewarderAddress: string
  rewardTokens: Erc20Metadata[]
}

export class StargateFarmV2Adapter implements IProtocolAdapter {
  productId = 'farm-v2'
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
      name: 'Stargate Farm V2',
      description:
        'Stargate is a fully composable liquidity transport protocol that lives at the heart of Omnichain DeFi',
      siteUrl: 'https://stargate.finance/',
      iconUrl: 'https://stargate.finance/favicons/favicon-light.svg',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    const { stargateStakingAddress } = staticChainDataV2[this.chainId]!
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
          underlyingTokens: [],
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
    const { stargateStakingAddress } = staticChainDataV2[this.chainId]!
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

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
