import { ethers, getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import {
  MaxMovementLimitExceededError,
  NotImplementedError,
} from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { logger } from '../../../../core/utils/logger'
import { Helpers } from '../../../../scripts/helpers'
import {
  Erc20ExtendedMetadata,
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { protocolContractAddresses } from '../../../aave-v2/common/aaveBasePoolAdapter'
import { Protocol } from '../../../protocols'
import {
  ATokenInstance__factory,
  IncentivesContract__factory,
  PoolContract__factory,
} from '../../contracts'
import { RewardsClaimedEvent } from '../../contracts/IncentivesContract'

export const AAVE_ICON_URL = 'https://cryptologos.cc/logos/aave-aave-logo.png'

export class AaveV3RewardsAdapter implements IProtocolAdapter {
  productId = 'rewards'
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

    if (this.chainId === Chain.Linea) {
      throw new NotImplementedError()
    }
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'AaveV3',
      description: 'AaveV3 defi adapter',
      siteUrl: 'https:',
      iconUrl: AAVE_ICON_URL,
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    return await Promise.all(
      protocolContractAddresses[this.protocolId]![this.chainId]!.map(
        async ({
          incentivesController: incentivesControllerAddress,
          marketLabel,
        }) => {
          const incentivesController = IncentivesContract__factory.connect(
            incentivesControllerAddress,
            this.provider,
          )

          const rewardTokenAddresses =
            await incentivesController.getRewardsList()

          const rewardTokens = await Promise.all(
            rewardTokenAddresses.map((rewardToken) => {
              return this.helpers.getTokenMetadata(rewardToken)
            }),
          )

          return {
            address: incentivesControllerAddress,
            name: `Aave V3 Rewards${marketLabel ? ` (${marketLabel})` : ''}`,
            symbol: 'Rewards',
            decimals: 18,
            underlyingTokens: rewardTokens,
          }
        },
      ),
    )
  }

  private detectPositionEventSignature(
    eventSignature = 'Transfer(address,address,uint256)',
  ): string {
    return ethers.id(eventSignature)
  }

  /**
   * Checks if the user has ever opened a position in AaveV3
   * Return IncentiveController addresses if found
   */
  private async openPositions(userAddress: string): Promise<string[]> {
    const topic0 = this.detectPositionEventSignature()
    const topic1 = ethers.zeroPadValue(ZERO_ADDRESS, 32)
    const topic2 = ethers.zeroPadValue(userAddress, 32)

    const logs = await this.provider.getLogs({
      topics: [topic0, topic1, topic2],
      fromBlock: '0x',
      toBlock: 'latest',
    })

    const aTokenAddresses = (
      await this.helpers.metadataProvider.getMetadata({
        protocolId: Protocol.AaveV3,
        productId: 'a-token',
      })
    ).map((token) => token.address)

    const filteredLogs = logs
      .filter((log) => aTokenAddresses.includes(log.address))
      .map((log) => log.address)

    const incentivesControllerAddresses = await Promise.all(
      filteredLogs.map(async (address) => {
        const aToken = ATokenInstance__factory.connect(address, this.provider)
        return getAddress(await aToken.getIncentivesController())
      }),
    )

    return [...new Set(incentivesControllerAddresses)]
  }

  async getPositions({
    userAddress,
    blockNumber,
    protocolTokenAddresses,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const protocolTokens = await this.getProtocolTokens()

    if (
      protocolTokenAddresses &&
      protocolTokenAddresses.length > 0 &&
      !protocolTokenAddresses.some((protocolTokenAddress) =>
        protocolTokens.some(
          (protocolToken) => protocolToken.address === protocolTokenAddress,
        ),
      )
    ) {
      return []
    }

    // Check if user has ever opened a position in AaveV3
    // Return the incentive controller addresses for those positions
    const incentiveControllerAddresses = await this.openPositions(userAddress)

    if (!incentiveControllerAddresses?.length) {
      return []
    }

    return await filterMapAsync(
      incentiveControllerAddresses,
      async (incentiveControllerAddress) => {
        const { underlyingTokens, ...protocolToken } = protocolTokens.find(
          (protocolToken) =>
            protocolToken.address === incentiveControllerAddress,
        )!

        const incentivesContract = IncentivesContract__factory.connect(
          protocolToken.address,
          this.provider,
        )

        const underlyingTokensWithRewards = await filterMapAsync(
          underlyingTokens,
          async (underlyingToken) => {
            const rewardBalance =
              await incentivesContract.getUserAccruedRewards(
                userAddress,
                underlyingToken.address,
                { blockTag: blockNumber },
              )

            if (!rewardBalance) {
              return undefined
            }

            return {
              ...underlyingToken,
              type: TokenType.UnderlyingClaimable,
              balanceRaw: rewardBalance,
            }
          },
        )

        if (underlyingTokensWithRewards.length === 0) {
          return undefined
        }

        return {
          ...protocolToken,
          type: TokenType.Protocol,
          balanceRaw: 1n, // choose 1 here as a zero value may cause the position to be ignored on UIs our adapters currently expecting a protocol token but on contract positions there is no token
          tokens: underlyingTokensWithRewards,
        }
      },
    )
  }

  /**
   * Rewards claimed by a user
   */
  async getWithdrawals({
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const protocolTokens = await this.getProtocolTokens()

    if (!protocolTokens) {
      throw new Error('No protocol tokens found')
    }

    return (
      await Promise.all(
        protocolTokens.map(async (incentivesPool) => {
          return await this.getClaimedRewards({
            incentivesPool,
            rewardTokens: incentivesPool.underlyingTokens,
            filter: { fromBlock, toBlock, userAddress },
          })
        }),
      )
    ).flat()
  }

  private async getClaimedRewards({
    incentivesPool,
    rewardTokens,
    filter: { fromBlock, toBlock, userAddress },
  }: {
    incentivesPool: ProtocolToken
    rewardTokens: Erc20Metadata[]
    filter: {
      fromBlock: number
      toBlock: number
      userAddress: string
      from?: string
      to?: string
    }
  }): Promise<MovementsByBlock[]> {
    const { underlyingTokens, ...protocolToken } = incentivesPool
    const protocolTokenContract = IncentivesContract__factory.connect(
      protocolToken.address,
      this.provider,
    )

    const filter = protocolTokenContract.filters.RewardsClaimed(userAddress)

    const eventResults =
      await protocolTokenContract.queryFilter<RewardsClaimedEvent.Event>(
        filter,
        fromBlock,
        toBlock,
      )

    // Temp fix to avoid timeouts
    // Remember these are on per pool basis.
    // We should monitor number
    // 20 interactions with same pool feels a healthy limit
    if (eventResults.length > 20) {
      throw new MaxMovementLimitExceededError()
    }

    const movements = await Promise.all(
      eventResults.map(async (transferEvent) => {
        const {
          blockNumber,
          args: {
            amount: protocolTokenMovementValueRaw,
            reward: rewardAddress,
          },
          transactionHash,
        } = transferEvent

        const rewardToken = rewardTokens.find(
          (token) => getAddress(token.address) === getAddress(rewardAddress),
        )

        if (!rewardToken) {
          logger.warn(
            `Reward token not found for address: ${rewardAddress} in protocol: ${this.protocolId}`,
          )
          throw new Error('Reward token not found')
        }

        return {
          transactionHash,
          protocolToken,
          tokens: [
            {
              address: rewardToken.address,
              name: rewardToken.name,
              symbol: rewardToken.symbol,
              decimals: rewardToken.decimals,
              balanceRaw: protocolTokenMovementValueRaw,
              type: TokenType.Underlying,
              blockNumber,
            },
          ],
          blockNumber,
        }
      }),
    )

    return movements.filter(Boolean)
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return [] // no deposits on a rewards contract
  }

  /**
   * I don't think TVL on a claimable rewards contract makes sense
   * In this case the reward tokens are not held in the reward contract
   * Reward contract has balance of 0
   * It appears the reward contract might have approvals to spend the reward tokens from things like the Arbitrum DAO
   */
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
