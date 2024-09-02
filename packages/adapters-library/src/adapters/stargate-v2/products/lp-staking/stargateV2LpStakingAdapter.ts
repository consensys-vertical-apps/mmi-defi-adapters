import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
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
import { staticChainData } from '../../common/staticChainData'
import {
  StargateMultiRewarder__factory,
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

  async getWithdrawals(input: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getMovements({
      ...input,
      filterType: 'withdrawal',
    })
  }

  async getDeposits(input: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getMovements({
      ...input,
      filterType: 'deposit',
    })
  }

  private async getMovements({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
    filterType,
  }: GetEventsInput & {
    filterType: 'deposit' | 'withdrawal'
  }): Promise<MovementsByBlock[]> {
    const { stargateStakingAddress } = staticChainData[this.chainId]!

    const protocolToken = await this.getProtocolTokenByAddress(
      protocolTokenAddress,
    )

    const lpStakingContract = StargateStaking__factory.connect(
      stargateStakingAddress,
      this.provider,
    )

    const filter =
      filterType === 'deposit'
        ? lpStakingContract.filters.Deposit(
            protocolTokenAddress,
            undefined,
            userAddress, // Address that receives the tokens (to)
            undefined,
          )
        : lpStakingContract.filters.Withdraw(
            protocolTokenAddress,
            userAddress, // Address from which the tokens are withdrawn (from)
            undefined,
            undefined,
          )

    const events = await lpStakingContract.queryFilter(
      filter,
      fromBlock,
      toBlock,
    )

    return events.map((event) => {
      const { amount } = event.args!

      return {
        protocolToken: {
          address: protocolToken.address,
          name: protocolToken.name,
          symbol: protocolToken.symbol,
          decimals: protocolToken.decimals,
        },
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        tokens: [
          {
            address: protocolToken.address,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
            type: TokenType.Underlying,
            blockNumber: event.blockNumber,
            balanceRaw: amount,
          },
        ],
      }
    })
  }

  async getRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const { rewardTokens, rewarderAddress, address, symbol, name, decimals } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    const multiRewarderContract = StargateMultiRewarder__factory.connect(
      rewarderAddress,
      this.provider,
    )

    const filter = multiRewarderContract.filters.RewardsClaimed(
      userAddress,
      undefined,
      undefined,
    )

    const events = await multiRewarderContract.queryFilter(
      filter,
      fromBlock,
      toBlock,
    )

    return events.map((event) => {
      const { rewardTokens: rewardTokenAddresses, amounts } = event.args!

      return {
        protocolToken: {
          address,
          name,
          symbol,
          decimals,
        },
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        tokens: rewardTokenAddresses.map((rewardTokenAddress, i) => {
          const rewardAmount = amounts[i]!

          const rewardToken = rewardTokens.find(
            (rewardToken) => rewardToken.address === rewardTokenAddress,
          )!

          return {
            address: rewardToken.address,
            name: rewardToken.name,
            symbol: rewardToken.symbol,
            decimals: rewardToken.decimals,
            type: TokenType.Underlying,
            blockNumber: event.blockNumber,
            balanceRaw: rewardAmount,
          }
        }),
      }
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

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
