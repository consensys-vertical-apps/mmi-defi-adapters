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

export type OrderStructOutput = [
  BigNumberish,
  BigNumberish,
  BigNumberish,
  BigNumberish,
] & {
  y: BigNumberish
  z: BigNumberish
  A: BigNumberish
  B: BigNumberish
}

interface StrategyCreatedEventObject {
  id: BigNumberish
  owner: string
  token0: string
  token1: string
  order0: OrderStructOutput
  order1: OrderStructOutput
}

interface StrategyUpdatedEventObject {
  id: BigNumberish
  token0: string
  token1: string
  order0: OrderStructOutput
  order1: OrderStructOutput
  reason: bigint
}

interface StrategyDeletedEventObject {
  id: BigNumberish
  owner: string
  token0: string
  token1: string
  order0: OrderStructOutput
  order1: OrderStructOutput
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
    fromBlock,
    toBlock,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    if (!tokenId) {
      throw new Error('TokenId required to get CarbonDeFi withdrawals')
    }
    return this.getCarbonMovements({
      tokenId,
      fromBlock,
      toBlock,
      eventType: 'withdrawals',
    })
  }

  /**
   * Update me.
   * Add logic to get user's deposits per position by block range
   */
  async getDeposits({
    fromBlock,
    toBlock,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    if (!tokenId) {
      throw new Error('TokenId required to get CarbonDeFi deposits')
    }
    return this.getCarbonMovements({
      tokenId,
      fromBlock,
      toBlock,
      eventType: 'deposits',
    })
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

  private async getCarbonMovements({
    tokenId,
    fromBlock,
    toBlock,
    eventType,
  }: {
    tokenId: string
    eventType: 'withdrawals' | 'deposits'
    fromBlock: number
    toBlock: number
  }) {
    const carbonControllerContract = CarbonController__factory.connect(
      contractAddresses[this.chainId]!.carbonControllerAddress,
      this.provider,
    )

    const eventFilters = {
      StrategyCreated:
        carbonControllerContract.filters.StrategyCreated(tokenId),
      StrategyUpdated:
        carbonControllerContract.filters.StrategyUpdated(tokenId),
      StrategyDeleted:
        carbonControllerContract.filters.StrategyDeleted(tokenId),
    }

    // Must query all StrategyCreated and StrategyUpdated events up to toBlock
    // to assess whether the StrategyUpdated events are withdrawals or deposits
    const strategyCreatedEvents = await carbonControllerContract.queryFilter(
      eventFilters['StrategyCreated'],
      undefined,
      toBlock,
    )
    const strategyUpdatedEvents = await carbonControllerContract.queryFilter(
      eventFilters['StrategyUpdated'],
      undefined,
      toBlock,
    )

    const strategyDeletedEvents = await carbonControllerContract.queryFilter(
      eventFilters['StrategyDeleted'],
      fromBlock,
      toBlock,
    )

    function processStrategyUpdated(
      strategyCreatedArr: typeof strategyCreatedEvents,
      strategyUpdatedArr: typeof strategyUpdatedEvents,
      eventType: 'withdrawals' | 'deposits',
    ): typeof strategyUpdatedEvents {
      const strategyUpdatedArrDiff = strategyUpdatedArr.map((item, index) => {
        const prevItem:
          | StrategyCreatedEventObject
          | StrategyUpdatedEventObject
          | undefined =
          index !== 0
            ? strategyUpdatedArr[index - 1]?.args
            : strategyCreatedArr[0]?.args
        const currentItem: StrategyUpdatedEventObject = item.args

        const token0Diff = prevItem
          ? BigInt(
              BigNumber(currentItem.order0.y.toString())
                .minus(prevItem.order0.y.toString())
                .toString(),
            )
          : BigInt(0)
        const token1Diff = prevItem
          ? BigInt(
              BigNumber(currentItem.order1.y.toString())
                .minus(prevItem.order1.y.toString())
                .toString(),
            )
          : BigInt(0)

        const temp = Object.assign({}, item)

        temp.args.order0.y = token0Diff
        temp.args.order1.y = token1Diff

        return temp
      })

      return strategyUpdatedArrDiff.filter((item) => {
        const currentItem: StrategyUpdatedEventObject = item.args

        return (
          (eventType === 'withdrawals'
            ? BigNumber(currentItem.order0.y.toString()).lt(0) ||
              BigNumber(currentItem.order1.y.toString()).lt(0)
            : eventType === 'deposits'
            ? BigNumber(currentItem.order0.y.toString()).gt(0) ||
              BigNumber(currentItem.order1.y.toString()).gt(0)
            : false) &&
          currentItem.reason.toString() == StrategyUpdateReason.Edit
        )
      })
    }

    const strategyUpdatedEventsProcessed = processStrategyUpdated(
      strategyCreatedEvents,
      strategyUpdatedEvents,
      eventType,
    )

    const parseLogs = async (
      logs: {
        blockNumber: number
        transactionHash: string
        args:
          | StrategyCreatedEventObject
          | StrategyUpdatedEventObject
          | StrategyDeletedEventObject
      }[],
    ) => {
      if (logs.length === 0) return []

      const [token0Metadata, token1Metadata] = await Promise.all([
        getTokenMetadata(logs[0]!.args.token0, this.chainId, this.provider),
        getTokenMetadata(logs[0]!.args.token1, this.chainId, this.provider),
      ])

      return logs.map((log) => {
        const { blockNumber, transactionHash } = log
        const logArgs:
          | StrategyCreatedEventObject
          | StrategyUpdatedEventObject
          | StrategyDeletedEventObject = log.args

        return {
          transactionHash,
          blockNumber,
          protocolToken: {
            address: contractAddresses[this.chainId]!.voucherContractAddress,
            name: 'Carbon Automated Trading Strategy',
            symbol: 'CARBON-STRAT',
            decimals: 18,
            tokenId: tokenId,
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

    const parsedStrategyCreatedEvents = await parseLogs(strategyCreatedEvents)
    const parsedStrategyUpdatedEvents = await parseLogs(
      strategyUpdatedEventsProcessed,
    )
    const parsedStrategyDeletedEvents = await parseLogs(strategyDeletedEvents)

    const strategyEvents =
      eventType === 'withdrawals'
        ? parsedStrategyUpdatedEvents.concat(parsedStrategyDeletedEvents)
        : eventType === 'deposits'
        ? parsedStrategyCreatedEvents
            .filter((item) => item.blockNumber > fromBlock)
            .concat(parsedStrategyUpdatedEvents)
        : []

    return strategyEvents
  }
}
