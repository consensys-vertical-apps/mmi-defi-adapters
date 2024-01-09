import { BigNumber } from 'bignumber.js'
import { BigNumberish } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/utils/customJsonRpcProvider'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  ProtocolAdapterParams,
  ProtocolDetails,
  PositionType,
  GetPositionsInput,
  GetEventsInput,
  MovementsByBlock,
  GetTotalValueLockedInput,
  GetProfitsInput,
  GetApyInput,
  GetAprInput,
  GetConversionRateInput,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenUnderlyingRate,
  ProfitsWithRange,
  ProtocolTokenTvl,
  ProtocolPosition,
  TokenType,
  TokenBalance,
  Underlying,
  UnderlyingTokenRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { CarbonController__factory, Voucher__factory } from '../../contracts'
import {
  StrategyCreatedEvent,
  StrategyDeletedEvent,
  StrategyUpdatedEvent,
} from '../../contracts/CarbonController'

const contractAddresses: Partial<
  Record<
    Chain,
    { carbonControllerAddress: string; voucherContractAddress: string }
  >
> = {
  [Chain.Ethereum]: {
    carbonControllerAddress: '0xC537e898CD774e2dCBa3B14Ea6f34C93d5eA45e1',
    voucherContractAddress: '0x3660F04B79751e31128f6378eAC70807e38f554E',
  },
}

enum StrategyUpdateReason {
  Edit = '0',
  Trade = '1',
}

export class CarbonDeFiStrategiesAdapter extends SimplePoolAdapter {
  productId = 'strategies'
  protocolId: Protocol
  chainId: Chain

  adaptersController: AdaptersController

  provider: CustomJsonRpcProvider

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
  }: ProtocolAdapterParams) {
    super({
      provider,
      chainId,
      protocolId,
      adaptersController,
    })
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
  }

  protected async fetchProtocolTokenMetadata(
    _protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    throw new NotImplementedError()
  }

  protected async fetchUnderlyingTokensMetadata(
    _protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    throw new NotImplementedError()
  }

  protected async getUnderlyingTokenBalances(_input: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    throw new NotImplementedError()
  }
  protected async getUnderlyingTokenConversionRate(
    _protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'CarbonDeFi',
      description: 'CarbonDeFi adapter for strategy balances',
      siteUrl: 'https://carbondefi.xyz',
      iconUrl: 'https://app.carbondefi.xyz/favicon.ico',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  /**
   * Update me.
   * Returning an array of your protocol tokens.
   */
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to get userAddress positions in your protocol
   */
  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const carbonControllerContract = CarbonController__factory.connect(
      contractAddresses[this.chainId]!.carbonControllerAddress,
      this.provider,
    )
    const voucherContract = Voucher__factory.connect(
      contractAddresses[this.chainId]!.voucherContractAddress,
      this.provider,
    )

    const strategyIds: BigNumberish[] = await voucherContract.tokensByOwner(
      userAddress,
      0,
      0,
      {
        blockTag: blockNumber,
      },
    )

    if (strategyIds.length > 0) {
      const results = await Promise.all(
        strategyIds.map(async (id) =>
          carbonControllerContract.strategy(id, {
            blockTag: blockNumber,
          }),
        ),
      )
      if (!results || results.length === 0) return []

      const positions: ProtocolPosition[][] = await Promise.all(
        results.map(async (strategyRes) => {
          const token0Metadata: Erc20Metadata = await getTokenMetadata(
            strategyRes.tokens[0],
            this.chainId,
            this.provider,
          )
          const token1Metadata: Erc20Metadata = await getTokenMetadata(
            strategyRes.tokens[1],
            this.chainId,
            this.provider,
          )
          return [
            {
              type: TokenType.Protocol,
              tokenId: strategyRes.id.toString(),
              balanceRaw: strategyRes.orders[0].y,
              ...token0Metadata,
            },
            {
              type: TokenType.Protocol,
              tokenId: strategyRes.id.toString(),
              balanceRaw: strategyRes.orders[1].y,
              ...token1Metadata,
            },
          ]
        }),
      )

      return positions.flat()
    }

    return []
  }

  /**
   * Update me.
   * Add logic to get user's withdrawals per position by block range
   */
  async getWithdrawals({
    userAddress,
    fromBlock,
    toBlock,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    if (!tokenId) {
      throw new Error('TokenId required to get CarbonDeFi withdrawals')
    } else if (!contractAddresses[this.chainId]) {
      return []
    }

    return this.getCarbonMovements(
      {
        userAddress,
        fromBlock,
        toBlock,
        tokenId,
      },
      'withdrawals',
    )
  }

  /**
   * Update me.
   * Add logic to get user's deposits per position by block range
   */
  async getDeposits({
    userAddress,
    fromBlock,
    toBlock,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    if (!tokenId) {
      throw new Error('TokenId required to get CarbonDeFi withdrawals')
    } else if (!contractAddresses[this.chainId]) {
      return []
    }

    return this.getCarbonMovements(
      {
        userAddress,
        fromBlock,
        toBlock,
        tokenId,
      },
      'deposits',
    )
  }

  /**
   * Update me.
   * Add logic to get tvl in a pool
   *
   */
  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to calculate the underlying token rate of 1 protocol token
   */
  async getProtocolTokenToUnderlyingTokenRate(
    _input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to calculate the users profits
   */
  async getProfits(_input: GetProfitsInput): Promise<ProfitsWithRange> {
    throw new NotImplementedError()
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  private processFilterStrategyUpdated(
    strategyCreatedRawLog: StrategyCreatedEvent.Log,
    strategyUpdatedLog: StrategyUpdatedEvent.Log[],
    eventType: 'deposits' | 'withdrawals',
  ): StrategyUpdatedEvent.Log[] {
    const strategyUpdatedProcessed: StrategyUpdatedEvent.Log[] = []

    for (let i = 0; i < strategyUpdatedLog.length; i++) {
      const prevItem:
        | StrategyCreatedEvent.OutputObject
        | StrategyUpdatedEvent.OutputObject
        | undefined =
        i !== 0 ? strategyUpdatedLog[i - 1]?.args : strategyCreatedRawLog.args
      const currentItem: StrategyUpdatedEvent.OutputObject | undefined =
        strategyUpdatedLog[i]?.args

      if (!prevItem || !currentItem) continue

      const token0Diff = BigInt(
        BigNumber(currentItem.order0.y.toString())
          .minus(prevItem.order0.y.toString())
          .toString(),
      )
      const token1Diff = BigInt(
        BigNumber(currentItem.order1.y.toString())
          .minus(prevItem.order1.y.toString())
          .toString(),
      )

      const updatedItem = {
        ...strategyUpdatedLog[i],
        args: {
          ...strategyUpdatedLog[i]!.args,
          order0: { ...strategyUpdatedLog[i]!.args.order0, y: token0Diff },
          order1: { ...strategyUpdatedLog[i]!.args.order1, y: token1Diff },
        },
      } as StrategyUpdatedEvent.Log

      strategyUpdatedProcessed.push(updatedItem)
    }

    return strategyUpdatedProcessed.filter((item) => {
      const currentItem: StrategyUpdatedEvent.OutputObject = item.args

      return (
        (eventType === 'deposits'
          ? BigNumber(currentItem.order0.y.toString()).gt(0) ||
            BigNumber(currentItem.order1.y.toString()).gt(0)
          : BigNumber(currentItem.order0.y.toString()).lt(0) ||
            BigNumber(currentItem.order1.y.toString()).lt(0)) &&
        currentItem.reason === BigInt(StrategyUpdateReason.Edit)
      )
    })
  }

  private parseLog(
    logs:
      | StrategyCreatedEvent.Log[]
      | StrategyUpdatedEvent.Log[]
      | StrategyDeletedEvent.Log[],
    token0Metadata: Erc20Metadata,
    token1Metadata: Erc20Metadata,
  ): MovementsByBlock[] {
    if (logs.length === 0) return []

    return logs.map((log) => {
      const { blockNumber, transactionHash } = log
      const logArgs:
        | StrategyCreatedEvent.OutputObject
        | StrategyUpdatedEvent.OutputObject
        | StrategyDeletedEvent.OutputObject = log.args

      return {
        transactionHash,
        blockNumber,
        protocolToken: {
          address: contractAddresses[this.chainId]!.voucherContractAddress,
          name: 'Carbon Automated Trading Strategy',
          symbol: 'CARBON-STRAT',
          decimals: 18,
          tokenId: logArgs.id.toString(),
        },
        tokens: [
          {
            type: TokenType.Underlying,
            balanceRaw: BigInt(logArgs.order0.y),
            ...token0Metadata,
            transactionHash,
            blockNumber,
          },
          {
            type: TokenType.Underlying,
            balanceRaw: BigInt(logArgs.order1.y),
            ...token1Metadata,
            transactionHash,
            blockNumber,
          },
        ],
      }
    })
  }

  private async getCarbonMovements(
    {
      userAddress,
      fromBlock,
      toBlock,
      tokenId,
    }: Pick<
      GetEventsInput,
      'userAddress' | 'fromBlock' | 'toBlock' | 'tokenId'
    >,
    eventType: 'deposits' | 'withdrawals',
  ): Promise<MovementsByBlock[]> {
    const carbonControllerContract = CarbonController__factory.connect(
      contractAddresses[this.chainId]!.carbonControllerAddress,
      this.provider,
    )

    const eventFilters = {
      StrategyCreated: carbonControllerContract.filters.StrategyCreated(
        undefined,
        userAddress,
      ),
      StrategyUpdated:
        carbonControllerContract.filters.StrategyUpdated(tokenId),
      StrategyDeleted: carbonControllerContract.filters.StrategyDeleted(
        undefined,
        userAddress,
      ),
    }

    // Must query all StrategyCreated and StrategyUpdated events up to toBlock
    // to assess whether the StrategyUpdated events are withdrawals or deposits
    const strategyCreatedEventRaw = (
      await carbonControllerContract.queryFilter(
        eventFilters['StrategyCreated'],
        undefined,
        toBlock,
      )
    ).find((eventData) => eventData.args.id.toString() === tokenId)

    if (!strategyCreatedEventRaw) return [] // no strategy with tokenId exists until toBlock

    const strategyUpdatedEventsRaw = await carbonControllerContract.queryFilter(
      eventFilters['StrategyUpdated'],
      undefined,
      toBlock,
    )

    const strategyDeletedEventRaw = (
      await carbonControllerContract.queryFilter(
        eventFilters['StrategyDeleted'],
        fromBlock,
        toBlock,
      )
    ).find((eventData) => eventData.args.id.toString() === tokenId)

    const strategyCreatedEvent =
      strategyCreatedEventRaw.blockNumber > fromBlock
        ? [strategyCreatedEventRaw]
        : []

    const strategyUpdatedEvents = this.processFilterStrategyUpdated(
      strategyCreatedEventRaw,
      strategyUpdatedEventsRaw,
      eventType,
    )

    const strategyDeletedEvent = strategyDeletedEventRaw
      ? [strategyDeletedEventRaw]
      : []

    const [token0Metadata, token1Metadata] = await Promise.all([
      getTokenMetadata(
        strategyCreatedEventRaw.args.token0,
        this.chainId,
        this.provider,
      ),
      getTokenMetadata(
        strategyCreatedEventRaw.args.token1,
        this.chainId,
        this.provider,
      ),
    ])

    const parsedStrategyCreatedEvent = this.parseLog(
      strategyCreatedEvent,
      token0Metadata,
      token1Metadata,
    )

    const parsedStrategyUpdatedEvents = this.parseLog(
      strategyUpdatedEvents,
      token0Metadata,
      token1Metadata,
    )

    const parsedStrategyDeletedEvent = this.parseLog(
      strategyDeletedEvent,
      token0Metadata,
      token1Metadata,
    )

    const strategyEvents =
      eventType === 'deposits'
        ? parsedStrategyCreatedEvent.concat(parsedStrategyUpdatedEvents)
        : parsedStrategyUpdatedEvents.concat(parsedStrategyDeletedEvent)

    return strategyEvents
  }
}
