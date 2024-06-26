import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import {
  AssetType,
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
  UnwrapExchangeRate,
  UnwrapInput,
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

const StrategyUpdateReasonEdit = 0n

export class CarbonDeFiStrategiesAdapter implements IProtocolAdapter {
  productId = 'strategies'
  protocolId: Protocol
  chainId: Chain

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

  adaptersController: AdaptersController

  provider: CustomJsonRpcProvider

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
  }

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

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    throw new NotImplementedError()
  }
  private protocolTokenName(token0Symbol: string, token1Symbol: string) {
    return `${token0Symbol} / ${token1Symbol}`
  }

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

    const strategyIds = await voucherContract.tokensByOwner(userAddress, 0, 0, {
      blockTag: blockNumber,
    })

    if (strategyIds.length > 0) {
      const results = await Promise.all(
        strategyIds.map(async (id) =>
          carbonControllerContract.strategy(id, {
            blockTag: blockNumber,
          }),
        ),
      )
      if (!results || results.length === 0) return []

      const positions: ProtocolPosition[] = await Promise.all(
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

          return {
            address: contractAddresses[this.chainId]!.voucherContractAddress,
            name: this.protocolTokenName(
              token0Metadata.symbol,
              token1Metadata.symbol,
            ),
            symbol: this.protocolTokenName(
              token0Metadata.symbol,
              token1Metadata.symbol,
            ),
            decimals: 18,
            type: TokenType.Protocol,
            tokenId: strategyRes.id.toString(),
            balanceRaw: 10n ** 18n,
            tokens: [
              {
                type: TokenType.Underlying,

                balanceRaw: strategyRes.orders[0].y,
                ...token0Metadata,
              },
              {
                type: TokenType.Underlying,

                balanceRaw: strategyRes.orders[1].y,
                ...token1Metadata,
              },
            ],
          }
        }),
      )

      return positions
    }

    return []
  }

  async getWithdrawals({
    userAddress,
    fromBlock,
    toBlock,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    if (!tokenId) {
      throw new Error('TokenId required to get CarbonDeFi withdrawals')
    }

    if (!contractAddresses[this.chainId]) {
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

  async getDeposits({
    userAddress,
    fromBlock,
    toBlock,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    if (!tokenId) {
      throw new Error('TokenId required to get CarbonDeFi withdrawals')
    }

    if (!contractAddresses[this.chainId]) {
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

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
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

      const token0Diff = currentItem.order0.y - prevItem.order0.y

      const token1Diff = currentItem.order1.y - prevItem.order1.y

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
          ? currentItem.order0.y > 0n || currentItem.order1.y > 0n
          : currentItem.order0.y < 0n || currentItem.order1.y < 0n) &&
        currentItem.reason === StrategyUpdateReasonEdit
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
            balanceRaw: logArgs.order0.y,
            ...token0Metadata,
            transactionHash,
            blockNumber,
          },
          {
            type: TokenType.Underlying,
            balanceRaw: logArgs.order1.y,
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
