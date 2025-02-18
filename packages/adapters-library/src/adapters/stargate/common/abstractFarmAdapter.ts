import { Erc20__factory } from '../../../contracts'
import { AdaptersController } from '../../../core/adaptersController'
import { Chain } from '../../../core/constants/chains'
import { CacheToDb } from '../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../core/utils/filters'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { Helpers } from '../../../core/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../types/IProtocolAdapter'
import {
  AdapterSettings,
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
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../types/adapter'
import { Protocol } from '../../protocols'
import {
  LpStaking,
  LpStakingTime,
  LpStakingTime__factory,
  LpStaking__factory,
} from '../contracts'
import { AdditionalMetadata } from '../products/farm/stargateFarmAdapter'

export abstract class AbstractStargateFarmAdapter implements IProtocolAdapter {
  productId = 'farm'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  abstract staticChainData: {
    factoryAddress: string
    lpStakingAddress: string
    lpStakingType: 'LpStaking' | 'LpStakingTime'
    lpStakingTimeMetisAddress?: string
  }

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
      name: 'Stargate Farm',
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
    const { lpStakingAddress, lpStakingType, lpStakingTimeMetisAddress } =
      this.staticChainData

    const lpStakingContract =
      lpStakingType === 'LpStaking'
        ? LpStaking__factory.connect(lpStakingAddress, this.provider)
        : LpStakingTime__factory.connect(lpStakingAddress, this.provider)

    const rewardTokenPromise = (
      lpStakingType === 'LpStaking'
        ? (lpStakingContract as LpStaking).stargate()
        : (lpStakingContract as LpStakingTime).eToken()
    ).then((rewardTokenAddress) =>
      getTokenMetadata(rewardTokenAddress, this.chainId, this.provider),
    )

    const poolLength = await lpStakingContract.poolLength()

    const poolPromises: Promise<ProtocolToken<AdditionalMetadata>>[] = []

    poolPromises.push(
      ...Array.from({ length: Number(poolLength) }, async (_, i) => {
        const { lpToken: protocolTokenAddress } =
          await lpStakingContract.poolInfo(i)

        const protocolToken = await getTokenMetadata(
          protocolTokenAddress,
          this.chainId,
          this.provider,
        )

        return {
          ...protocolToken,
          poolIndex: i,
          rewardToken: await rewardTokenPromise,
          lpStakingType,
          lpStakingAddress,
          underlyingTokens: [],
        }
      }),
    )

    if (lpStakingTimeMetisAddress) {
      poolPromises.push(
        (async () => {
          const lpStakingTimeMetisContract = LpStakingTime__factory.connect(
            lpStakingTimeMetisAddress,
            this.provider,
          )

          const [{ lpToken: protocolTokenAddress }, rewardTokenAddress] =
            await Promise.all([
              lpStakingTimeMetisContract.poolInfo(0),
              lpStakingTimeMetisContract.eToken(),
            ])

          const [protocolToken, rewardToken] = await Promise.all([
            getTokenMetadata(protocolTokenAddress, this.chainId, this.provider),
            getTokenMetadata(rewardTokenAddress, this.chainId, this.provider),
          ])

          return {
            ...protocolToken,
            poolIndex: 0,
            rewardToken,
            lpStakingType: 'LpStakingTime',
            lpStakingAddress: lpStakingTimeMetisAddress,
            underlyingTokens: [],
          }
        })(),
      )
    }

    return await Promise.all(poolPromises)
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
    const protocolTokens = await this.getProtocolTokens()

    return await filterMapAsync(protocolTokens, async (protocolToken) => {
      if (
        protocolTokenAddresses &&
        !protocolTokenAddresses.includes(protocolToken.address)
      ) {
        return undefined
      }

      const lpStakingContract =
        protocolToken.lpStakingType === 'LpStaking'
          ? LpStaking__factory.connect(
              protocolToken.lpStakingAddress,
              this.provider,
            )
          : LpStakingTime__factory.connect(
              protocolToken.lpStakingAddress,
              this.provider,
            )

      const { amount } = await lpStakingContract.userInfo(
        protocolToken.poolIndex,
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
    const { lpStakingAddress, lpStakingType } = this.staticChainData
    const { poolIndex, rewardToken } =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    const rewardFunctionInput = [
      poolIndex,
      userAddress,
      { blockTag: blockNumber },
    ] as const

    const pendingStargateReward = await (lpStakingType === 'LpStaking'
      ? LpStaking__factory.connect(
          lpStakingAddress,
          this.provider,
        ).pendingStargate(...rewardFunctionInput)
      : LpStakingTime__factory.connect(
          lpStakingAddress,
          this.provider,
        ).pendingEmissionToken(...rewardFunctionInput))

    return [
      {
        ...rewardToken,
        type: TokenType.UnderlyingClaimable,
        balanceRaw: pendingStargateReward,
      },
    ]
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
    const protocolToken =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    const lpStakingContract =
      protocolToken.lpStakingType === 'LpStaking'
        ? LpStaking__factory.connect(
            protocolToken.lpStakingAddress,
            this.provider,
          )
        : LpStakingTime__factory.connect(
            protocolToken.lpStakingAddress,
            this.provider,
          )

    const filter =
      filterType === 'deposit'
        ? lpStakingContract.filters.Deposit(
            userAddress,
            protocolToken.poolIndex,
            undefined,
          )
        : lpStakingContract.filters.Withdraw(
            userAddress,
            protocolToken.poolIndex,
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

  /**
   * There are no specific events for rewards, which occur as simple transfers whenever a Deposit or Withdrawal is actioned
   * For this reason, we need to fetch all Deposit and Withdrawal events and then filter out the reward transfers
   */
  async getRewardWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlockReward[]> {
    const protocolToken =
      await this.getProtocolTokenByAddress(protocolTokenAddress)

    const lpStakingContract =
      protocolToken.lpStakingType === 'LpStaking'
        ? LpStaking__factory.connect(
            protocolToken.lpStakingAddress,
            this.provider,
          )
        : LpStakingTime__factory.connect(
            protocolToken.lpStakingAddress,
            this.provider,
          )

    const depositFilter = lpStakingContract.filters.Deposit(
      userAddress,
      protocolToken.poolIndex,
      undefined,
    )

    const withdrawalFilter = lpStakingContract.filters.Withdraw(
      userAddress,
      protocolToken.poolIndex,
      undefined,
    )

    const [depositEvents, withdrawalEvents] = await Promise.all([
      lpStakingContract.queryFilter(depositFilter, fromBlock, toBlock),
      lpStakingContract.queryFilter(withdrawalFilter, fromBlock, toBlock),
    ])

    const rewardTokenContract = Erc20__factory.connect(
      protocolToken.rewardToken.address,
      this.provider,
    )

    const txHashes = Array.from(
      new Set<string>([
        ...depositEvents.map((event) => event.transactionHash),
        ...withdrawalEvents.map((event) => event.transactionHash),
      ]),
    )

    return await filterMapAsync(txHashes, async (txHash) => {
      const txEvents = await this.provider.getTransactionReceipt(txHash)

      // Filter for Transfer event from the lpStakingContract to the userAddress
      const transferAmount = txEvents?.logs?.find(
        (log) =>
          log.address === protocolToken.rewardToken.address &&
          log.topics[0] ===
            rewardTokenContract.interface.getEvent('Transfer')?.topicHash &&
          log.topics[1]?.includes(
            protocolToken.lpStakingAddress.toLowerCase().slice(2),
          ) &&
          log.topics[2]?.includes(userAddress.toLowerCase().slice(2)),
      )?.data

      if (!transferAmount) {
        return undefined
      }

      return {
        protocolToken: {
          address: protocolToken.address,
          name: protocolToken.name,
          symbol: protocolToken.symbol,
          decimals: protocolToken.decimals,
        },
        blockNumber: txEvents.blockNumber,
        transactionHash: txHash,
        tokens: [
          {
            address: protocolToken.rewardToken.address,
            name: protocolToken.rewardToken.name,
            symbol: protocolToken.rewardToken.symbol,
            decimals: protocolToken.rewardToken.decimals,
            type: TokenType.UnderlyingClaimable,
            blockNumber: txEvents.blockNumber,
            balanceRaw: BigInt(transferAmount),
          },
        ],
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
