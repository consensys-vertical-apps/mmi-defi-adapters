import { ethers, getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import {
  MaxMovementLimitExceededError,
  NotImplementedError,
} from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
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
import { Protocol } from '../../../protocols'
import {
  IncentivesContract,
  IncentivesContract__factory,
} from '../../contracts'
import { RewardsClaimedEvent } from '../../contracts/IncentivesContract'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'

export const AAVE_ICON_URL = 'https://cryptologos.cc/logos/aave-aave-logo.png'

export class AaveV3RewardsAdapter implements IProtocolAdapter {
  productId = 'rewards'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  private incentivesContract: IncentivesContract

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

  private INCENTIVES_CONTRACT_ADDRESSES = {
    [Chain.Arbitrum]: getAddress('0x929EC64c34a17401F460460D4B9390518E5B473e'),
    [Chain.Ethereum]: getAddress('0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb'),
    [Chain.Fantom]: getAddress('0x929EC64c34a17401F460460D4B9390518E5B473e'),
    [Chain.Avalanche]: getAddress('0x929EC64c34a17401F460460D4B9390518E5B473e'),
    [Chain.Bsc]: getAddress('0xC206C2764A9dBF27d599613b8F9A63ACd1160ab4'),
    [Chain.Base]: getAddress('0xf9cc4F0D883F1a1eb2c253bdb46c254Ca51E1F44'),
    [Chain.Polygon]: getAddress('0x929EC64c34a17401F460460D4B9390518E5B473e'),
    [Chain.Optimism]: getAddress('0x929EC64c34a17401F460460D4B9390518E5B473e'),
    [Chain.Linea]: '', // not deployed on linea
  }

  private INCENTIVES_CONTRACT_DETAILS: Erc20Metadata

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

    this.incentivesContract = IncentivesContract__factory.connect(
      this.INCENTIVES_CONTRACT_ADDRESSES[this.chainId],
      this.provider,
    )

    /**
     * Fake protocol token created to satisfy return type
     */
    this.INCENTIVES_CONTRACT_DETAILS = {
      address: this.INCENTIVES_CONTRACT_ADDRESSES[this.chainId],
      name: 'Aave V3 Rewards',
      symbol: 'Rewards',
      decimals: 18,
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

  /**
   *
   * AToken addresses required to query reward balances
   */
  async getAaveTokenAddresses(): Promise<string[]> {
    const [aTokens, stableDebtTokens, variableDebtTokens] = await Promise.all([
      this.helpers.metadataProvider.getMetadata({
        protocolId: Protocol.AaveV3,
        productId: 'a-token',
      }),
      this.helpers.metadataProvider.getMetadata({
        protocolId: Protocol.AaveV3,
        productId: 'stable-debt-token',
      }),
      this.helpers.metadataProvider.getMetadata({
        protocolId: Protocol.AaveV3,
        productId: 'variable-debt-token',
      }),
    ])
    return [
      ...aTokens.map((token) => token.address),
      ...stableDebtTokens.map((token) => token.address),
      ...variableDebtTokens.map((token) => token.address),
    ]
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const rewardTokenAddresses = await this.incentivesContract.getRewardsList()

    const rewardTokens = await Promise.all(
      rewardTokenAddresses.map((rewardToken) => {
        return this.helpers.getTokenMetadata(rewardToken)
      }),
    )

    return [
      { ...this.INCENTIVES_CONTRACT_DETAILS, underlyingTokens: rewardTokens },
    ]
  }

  private detectPositionEventSignature(
    eventSignature = 'Transfer(address,address,uint256)',
  ): string {
    return ethers.id(eventSignature)
  }

  /**
   * Checks if the user has ever opened a position in AaveV3
   * Return AToken addresses if found
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

    const aTokenAddresses = await this.getAaveTokenAddresses()

    const filteredLogs = logs
      .filter((log) => aTokenAddresses.includes(log.address))
      .map((log) => log.address)

    return [...new Set(filteredLogs)]
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const { userAddress, blockNumber, protocolTokenAddresses } = input

    // Check if user has ever opened a position in AaveV3
    const addressFilter = await this.openPositions(userAddress)

    // Return empty array if user has never opened a AaveV3 position
    if (!addressFilter?.length) {
      return []
    }

    // Fetch reward contract details
    const protocolTokens = await this.getProtocolTokens()
    const protocolToken = protocolTokens[0]

    // If no protocolToken is found, return empty
    if (!protocolToken) {
      throw new Error('No protocol token found')
    }

    // Fetch and filter underlying tokens with non-zero rewards in parallel
    const underlyingTokens = await this.getClaimableUnderlyingTokens(
      userAddress,
      protocolToken.underlyingTokens,
      blockNumber,
    )

    // If no claimable underlying tokens are found, return empty
    if (underlyingTokens.length === 0) {
      return []
    }

    // Return the final ProtocolPosition object
    return [
      {
        type: TokenType.Protocol,
        balanceRaw: 1n, // choose 1 here as a zero value may cause the position to be ignored on UIs our adapters currently expecting a protocol token but on contract positions there is no token
        ...this.INCENTIVES_CONTRACT_DETAILS,
        tokens: underlyingTokens,
      },
    ]
  }

  /**
   *
   * Fetches claimable underlying tokens for a user
   */
  private async getClaimableUnderlyingTokens(
    userAddress: string,
    underlyingTokens: Erc20ExtendedMetadata[],
    blockNumber?: number,
  ): Promise<Underlying[]> {
    const tokenRewards = await Promise.all(
      underlyingTokens.map(async (underlying) => {
        const rewardBalance =
          await this.incentivesContract.getUserAccruedRewards(
            userAddress,
            underlying.address,
            { blockTag: blockNumber },
          )
        return { rewardBalance, underlying }
      }),
    )

    // Filter out tokens with zero rewards
    return tokenRewards
      .filter(({ rewardBalance }) => rewardBalance > 0n)
      .map(({ rewardBalance, underlying }) => ({
        ...underlying,
        type: TokenType.UnderlyingClaimable,
        balanceRaw: rewardBalance,
      }))
  }

  /**
   * Rewards claimed by a user
   */
  async getWithdrawals({
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const protocolTokens = (await this.getProtocolTokens())[0]

    if (!protocolTokens) {
      throw new Error('No protocol tokens found')
    }

    return this.getClaimedRewards({
      rewardTokens: protocolTokens.underlyingTokens,
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getClaimedRewards({
    rewardTokens,
    filter: { fromBlock, toBlock, userAddress },
  }: {
    rewardTokens: Erc20Metadata[]
    filter: {
      fromBlock: number
      toBlock: number
      userAddress: string
      from?: string
      to?: string
    }
  }): Promise<MovementsByBlock[]> {
    const protocolTokenContract = IncentivesContract__factory.connect(
      this.INCENTIVES_CONTRACT_DETAILS.address,
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
          protocolToken: {
            ...this.INCENTIVES_CONTRACT_DETAILS,
          },
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

    return movements.filter((movement) => movement !== undefined)
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
