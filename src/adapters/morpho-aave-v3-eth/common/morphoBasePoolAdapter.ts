import { formatUnits } from 'ethers'
import * as constants from 'evm-maths/lib/constants'
import * as RayMath from 'evm-maths/lib/ray'
import { AdaptersController } from '../../../core/adaptersController'
import { Chain } from '../../../core/constants/chains'
import { SECONDS_PER_YEAR } from '../../../core/constants/SECONDS_PER_YEAR'
import { ZERO_ADDRESS } from '../../../core/constants/ZERO_ADDRESS'
import { IMetadataBuilder } from '../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../core/errors/errors'
import { aggregateTrades } from '../../../core/utils/aggregateTrades'
import { aprToApy } from '../../../core/utils/aprToApy'
import { CustomJsonRpcProvider } from '../../../core/utils/customJsonRpcProvider'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { logger } from '../../../core/utils/logger'
import { formatProtocolTokenArrayToMap } from '../../../core/utils/protocolTokenToMap'
import {
  GetPositionsInput,
  GetEventsInput,
  GetApyInput,
  GetAprInput,
  GetTotalValueLockedInput,
  GetProfitsInput,
  GetConversionRateInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenUnderlyingRate,
  ProfitsWithRange,
  ProtocolTokenTvl,
  ProtocolPosition,
  TokenBalance,
  TokenType,
  Underlying,
  UnderlyingTokenRate,
  BaseTokenMovement,
} from '../../../types/adapter'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import { Protocol } from '../../protocols'
import {
  MorphoAaveV3__factory,
  AToken__factory,
  AaveV3Pool__factory,
} from '../../morpho-aave-v2/contracts'
import {
  SuppliedEvent,
  CollateralSuppliedEvent,
  WithdrawnEvent,
  CollateralWithdrawnEvent,
  BorrowedEvent,
  RepaidEvent,
} from '../../morpho-aave-v2/contracts/MorphoAaveV3'
import { MorphoAaveMath } from '../internal-utils/AaveV3.maths'
import P2PInterestRates from '../internal-utils/P2PInterestRates'
import { min } from 'evm-maths/lib/utils'
import { rayToPercent } from 'evm-maths/lib/ray'
import { RAY } from '../../../core/constants/RAY'

// TODOs:
// - clean useless variables
// - sort for lint
type MorphoAaveV3PeerToPoolAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
  }
>

const morphoAaveV3ContractAddresses: Partial<
  Record<Protocol, Partial<Record<Chain, string>>>
> = {
  [Protocol.MorphoAaveV3ETHOptimizer]: {
    [Chain.Ethereum]: '0x33333aea097c193e66081e930c33020272b33333',
  },
}

export abstract class MorphoBasePoolAdapter implements IMetadataBuilder {
  protocolId: Protocol
  chainId: Chain

  protected _provider: CustomJsonRpcProvider

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
  }: ProtocolAdapterParams) {
    this._provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
  }

  __IRM__ = new P2PInterestRates()
  __MATH__ = new MorphoAaveMath()
  oracleAddress = '0xA50ba011c48153De246E5192C8f9258A2ba79Ca9'
  poolAddress = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'

  adaptersController: AdaptersController

  abstract getProtocolDetails(): ProtocolDetails

  private _metadataCache: MorphoAaveV3PeerToPoolAdapterMetadata | null = null

  // ok
  async buildMetadata() {
    if (this._metadataCache) {
      return this._metadataCache
    }

    const morphoAaveV3Contract = MorphoAaveV3__factory.connect(
      morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    const metadataObject: MorphoAaveV3PeerToPoolAdapterMetadata = {}

    const markets = await morphoAaveV3Contract.marketsCreated()

    await Promise.all(
      markets.map(async (marketAddress) => {
        const pool = AaveV3Pool__factory.connect(
          this.poolAddress,
          this._provider,
        )
        const aTokenAddress = (await pool.getReserveData(marketAddress))
          .aTokenAddress

        const aTokenContract = AToken__factory.connect(
          aTokenAddress,
          this._provider,
        )

        const supplyTokenAddress = await aTokenContract
          .UNDERLYING_ASSET_ADDRESS()
          .catch((err) => {
            if (err) return ZERO_ADDRESS
            throw err
          })

        // Await the promises directly within Promise.all
        const [protocolToken, underlyingToken] = await Promise.all([
          getTokenMetadata(aTokenAddress, this.chainId, this._provider),
          getTokenMetadata(supplyTokenAddress, this.chainId, this._provider),
        ])

        metadataObject[protocolToken.address] = {
          protocolToken,
          underlyingToken,
        }
      }),
    )

    this._metadataCache = metadataObject
    return metadataObject
  }

  // ok
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  // ok
  protected async _fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this._fetchPoolMetadata(
      protocolTokenAddress,
    )

    return protocolToken
  }
  // ok
  private async _fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }
  // ok
  protected async _getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const { underlyingToken } = await this._fetchPoolMetadata(
      protocolTokenBalance.address,
    )

    const underlyingTokenBalance = {
      ...underlyingToken,
      balanceRaw: protocolTokenBalance.balanceRaw,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }
  // ok
  protected async _fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken } = await this._fetchPoolMetadata(
      protocolTokenAddress,
    )

    return [underlyingToken]
  }

  // ok
  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const morphoAaveV3 = MorphoAaveV3__factory.connect(
      morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    // const pool = AaveV3Pool__factory.connect(this.poolAddress, this._provider)

    const tokens = await this.getProtocolTokens()
    const positionType = this.getProtocolDetails().positionType

    const getBalance = async (
      market: Erc20Metadata,
      userAddress: string,
      blockNumber: number,
    ): Promise<bigint> => {
      let balanceRaw
      if (positionType === PositionType.Supply) {
        const [supplyBalance, collateralBalance] = await Promise.all([
          morphoAaveV3.supplyBalance(market.address, userAddress, {
            blockTag: blockNumber,
          }),
          morphoAaveV3.collateralBalance(market.address, userAddress, {
            blockTag: blockNumber,
          }),
        ])
        balanceRaw = supplyBalance + collateralBalance
      } else {
        balanceRaw = await morphoAaveV3.borrowBalance(
          market.address,
          userAddress,
          {
            blockTag: blockNumber,
          },
        )
      }
      return balanceRaw
    }

    const protocolTokensBalances = await Promise.all(
      tokens.map(async (market) => {
        const { underlyingToken } = await this._fetchPoolMetadata(
          market.address,
        )
        const amount = await getBalance(
          underlyingToken,
          userAddress,
          blockNumber!,
        )
        console.log(amount)
        return {
          address: market.address,
          balance: amount,
        }
      }),
    )

    const protocolTokens: ProtocolPosition[] = await Promise.all(
      protocolTokensBalances
        .filter((protocolTokenBalance) => protocolTokenBalance.balance !== 0n) // Filter out balances equal to 0
        .map(async (protocolTokenBalance) => {
          const tokenMetadata = await this._fetchProtocolTokenMetadata(
            protocolTokenBalance.address,
          )

          const completeTokenBalance: TokenBalance = {
            address: protocolTokenBalance.address,
            balanceRaw: protocolTokenBalance.balance,
            name: tokenMetadata.name,
            symbol: tokenMetadata.symbol,
            decimals: tokenMetadata.decimals,
          }

          const underlyingTokenBalances =
            await this._getUnderlyingTokenBalances({
              userAddress,
              protocolTokenBalance: completeTokenBalance,
              blockNumber,
            })

          return {
            ...protocolTokenBalance,
            balanceRaw: protocolTokenBalance.balance,
            name: tokenMetadata.name,
            symbol: tokenMetadata.symbol,
            decimals: tokenMetadata.decimals,
            type: TokenType.Protocol,
            tokens: underlyingTokenBalances,
          }
        }),
    )
    return protocolTokens
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this._getMovements({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'withdrawn',
    })
  }

  async getCollateralWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this._getMovements({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'collat-withdrawn',
    })
  }

  // OK
  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this._getMovements({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'supplied' || 'collat-supplied',
    })
  }

  async getCollateralDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this._getMovements({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'collat-supplied',
    })
  }

  // ok
  async getBorrows({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this._getMovements({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'borrowed',
    })
  }

  // ok
  async getRepays({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this._getMovements({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'repaid',
    })
  }

  // OK
  async getProfits({
    userAddress,
    fromBlock,
    toBlock,
  }: GetProfitsInput): Promise<ProfitsWithRange> {
    // Fetch end and start position values
    const positionType = this.getProtocolDetails().positionType

    const [endPositionValues, startPositionValues] = await Promise.all([
      this.getPositions({
        userAddress,
        blockNumber: toBlock,
      }).then(formatProtocolTokenArrayToMap),
      this.getPositions({
        userAddress,
        blockNumber: fromBlock,
      }).then(formatProtocolTokenArrayToMap),
    ])

    // Fetch and process each token's movements
    const tokens = await Promise.all(
      Object.values(endPositionValues).map(
        async ({
          protocolTokenMetadata,
          underlyingTokenPositions: underlyingEndPositions,
        }) => {
          const getEventsInput: GetEventsInput = {
            userAddress,
            protocolTokenAddress: protocolTokenMetadata.address,
            fromBlock,
            toBlock,
          }
          let eventsOut: Record<string, bigint>
          let eventsIn: Record<string, bigint>

          if (positionType === PositionType.Supply) {
            const [
              withdrawalEvents,
              depositEvents,
              collateralDepositEvents,
              collateralWithdrawalEvents,
            ] = await Promise.all([
              this.getWithdrawals(getEventsInput).then(aggregateTrades),
              this.getDeposits(getEventsInput).then(aggregateTrades),
              this.getCollateralDeposits(getEventsInput).then(aggregateTrades),
              this.getCollateralWithdrawals(getEventsInput).then(
                aggregateTrades,
              ),
            ])
            eventsOut = { ...withdrawalEvents, ...collateralWithdrawalEvents }
            eventsIn = { ...depositEvents, ...collateralDepositEvents }
          } else {
            ;[eventsOut, eventsIn] = await Promise.all([
              this.getBorrows(getEventsInput).then(aggregateTrades),
              this.getRepays(getEventsInput).then(aggregateTrades),
            ])
          }

          return {
            ...protocolTokenMetadata,
            type: TokenType.Protocol,
            tokens: Object.values(underlyingEndPositions).map(
              ({
                address,
                name,
                symbol,
                decimals,
                balanceRaw: endPositionValueRaw,
              }) => {
                const startPositionValueRaw =
                  startPositionValues[protocolTokenMetadata.address]
                    ?.underlyingTokenPositions[address]?.balanceRaw ?? 0n

                const calculationData = {
                  outRaw: eventsOut[address] ?? 0n,
                  inRaw: eventsIn[address] ?? 0n,
                  endPositionValueRaw: endPositionValueRaw ?? 0n,
                  startPositionValueRaw,
                }

                let profitRaw =
                  calculationData.endPositionValueRaw +
                  calculationData.outRaw -
                  calculationData.inRaw -
                  calculationData.startPositionValueRaw

                if (
                  this.getProtocolDetails().positionType === PositionType.Borrow
                ) {
                  profitRaw *= -1n
                }

                return {
                  address,
                  name,
                  symbol,
                  decimals,
                  profitRaw,
                  type: TokenType.Underlying,
                  calculationData: {
                    withdrawalsRaw: eventsOut[address] ?? 0n,
                    withdrawals: formatUnits(
                      eventsOut[address] ?? 0n,
                      decimals,
                    ),
                    depositsRaw: eventsIn[address] ?? 0n,
                    deposits: formatUnits(eventsIn[address] ?? 0n, decimals),
                    startPositionValueRaw: startPositionValueRaw ?? 0n,
                    startPositionValue: formatUnits(
                      startPositionValueRaw ?? 0n,
                      decimals,
                    ),
                    endPositionValueRaw,
                    endPositionValue: formatUnits(
                      endPositionValueRaw ?? 0n,
                      decimals,
                    ),
                  },
                }
              },
            ),
          }
        },
      ),
    )

    return { tokens, fromBlock, toBlock }
  }

  // OK & tested
  async getTotalValueLocked({
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const tokens = await this.getProtocolTokens()

    const morphoAaveV3 = MorphoAaveV3__factory.connect(
      morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    const pool = AaveV3Pool__factory.connect(this.poolAddress, this._provider)
    const positionType = this.getProtocolDetails().positionType
    return Promise.all(
      tokens.map(async (tokenMetadata) => {
        let totalValueRaw
        const { underlyingToken } = await this._fetchPoolMetadata(
          tokenMetadata.address,
        )
        if (positionType === PositionType.Supply) {
          const [
            {
              idleSupply,
              indexes,
              deltas,
              p2pIndexCursor,
              reserveFactor,
              aToken: aTokenAddress,
            },
            { liquidityIndex, variableBorrowIndex },
          ] = await Promise.all([
            morphoAaveV3.market(underlyingToken.address, {
              blockTag: blockNumber,
            }),
            pool.getReserveData(underlyingToken.address, {
              blockTag: blockNumber,
            }),
          ])

          const aToken = AToken__factory.connect(aTokenAddress, this._provider)

          const supplyOnPool = await aToken.balanceOf(
            morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
            {
              blockTag: blockNumber,
            },
          )

          const proportionIdle =
            idleSupply === 0n
              ? 0n
              : min(
                  // To avoid proportionIdle > 1 with rounding errors
                  this.__MATH__.ONE,
                  this.__MATH__.indexDiv(
                    idleSupply,
                    this.__MATH__.indexMul(
                      deltas.supply.scaledP2PTotal,
                      indexes.supply.p2pIndex,
                    ),
                  ),
                )
          const { newP2PSupplyIndex } = this.__IRM__.computeP2PIndexes({
            deltas,
            proportionIdle,
            p2pIndexCursor: BigInt(p2pIndexCursor),
            reserveFactor: BigInt(reserveFactor),
            lastBorrowIndexes: {
              poolIndex: BigInt(indexes.borrow.poolIndex),
              p2pIndex: BigInt(indexes.borrow.p2pIndex),
            },
            lastSupplyIndexes: {
              poolIndex: BigInt(indexes.supply.poolIndex),
              p2pIndex: BigInt(indexes.supply.p2pIndex),
            },
            poolBorrowIndex: BigInt(variableBorrowIndex),
            poolSupplyIndex: BigInt(liquidityIndex),
          })

          const supplyInP2P = this.__MATH__.indexMul(
            deltas.supply.scaledP2PTotal,
            newP2PSupplyIndex,
          )

          totalValueRaw = supplyInP2P + supplyOnPool
        } else {
          const [
            {
              idleSupply,
              indexes,
              deltas,
              p2pIndexCursor,
              reserveFactor,
              aToken: aTokenAddress,
              variableDebtToken: variableDebtTokenAddress,
            },
            { liquidityIndex, variableBorrowIndex },
          ] = await Promise.all([
            morphoAaveV3.market(tokenMetadata.address, {
              blockTag: blockNumber,
            }),
            pool.getReserveData(tokenMetadata.address, {
              blockTag: blockNumber,
            }),
          ])

          const variableDebtToken = AToken__factory.connect(
            variableDebtTokenAddress,
            this._provider,
          )

          const borrowOnPool = await variableDebtToken.balanceOf(
            morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
            {
              blockTag: blockNumber,
            },
          )

          const proportionIdle =
            idleSupply == 0n
              ? 0n
              : min(
                  // To avoid proportionIdle > 1 with rounding errors
                  this.__MATH__.ONE,
                  this.__MATH__.indexDiv(
                    idleSupply,
                    this.__MATH__.indexMul(
                      deltas.supply.scaledP2PTotal,
                      indexes.supply.p2pIndex,
                    ),
                  ),
                )

          const { newP2PBorrowIndex } = this.__IRM__.computeP2PIndexes({
            deltas,
            proportionIdle,
            p2pIndexCursor: BigInt(p2pIndexCursor),
            reserveFactor: BigInt(reserveFactor),
            lastBorrowIndexes: {
              poolIndex: BigInt(indexes.borrow.poolIndex),
              p2pIndex: BigInt(indexes.borrow.p2pIndex),
            },
            lastSupplyIndexes: {
              poolIndex: BigInt(indexes.supply.poolIndex),
              p2pIndex: BigInt(indexes.supply.p2pIndex),
            },
            poolBorrowIndex: BigInt(variableBorrowIndex),
            poolSupplyIndex: BigInt(liquidityIndex),
          })

          const borrowInP2P = this.__MATH__.indexMul(
            deltas.borrow.scaledP2PTotal,
            newP2PBorrowIndex,
          )
          totalValueRaw = borrowInP2P + borrowOnPool
        }

        return {
          ...tokenMetadata,
          type: TokenType.Protocol,
          totalSupplyRaw: totalValueRaw !== undefined ? totalValueRaw : 0n,
        }
      }),
    )
  }

  // ok
  protected async _getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    const { underlyingToken } = await this._fetchPoolMetadata(
      protocolTokenMetadata.address,
    )

    // 'balanceOf' of 'aTokens' is already scaled with the exchange rate
    const PRICE_PEGGED_TO_ONE = 1
    const pricePerShareRaw = BigInt(
      PRICE_PEGGED_TO_ONE * 10 ** protocolTokenMetadata.decimals,
    )

    return [
      {
        ...underlyingToken,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }

  async getProtocolTokenToUnderlyingTokenRate(
    _input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate> {
    throw new NotImplementedError()
  }

  // ok
  protected _extractEventData(
    eventLog:
      | SuppliedEvent.Log
      | CollateralSuppliedEvent.Log
      | WithdrawnEvent.Log
      | CollateralWithdrawnEvent.Log
      | RepaidEvent.Log
      | BorrowedEvent.Log,
  ) {
    return eventLog.args
  }

  // ok
  protected _castEventToLogType(
    event: unknown,
    eventType:
      | 'supplied'
      | 'collat-supplied'
      | 'withdrawn'
      | 'collat-withdrawn'
      | 'repaid'
      | 'borrowed',
  ):
    | SuppliedEvent.Log
    | WithdrawnEvent.Log
    | RepaidEvent.Log
    | BorrowedEvent.Log {
    switch (eventType) {
      case 'supplied':
        return event as SuppliedEvent.Log
      case 'collat-supplied':
        return event as SuppliedEvent.Log
      case 'withdrawn':
        return event as WithdrawnEvent.Log
      case 'collat-withdrawn':
        return event as CollateralWithdrawnEvent.Log
      case 'repaid':
        return event as RepaidEvent.Log
      case 'borrowed':
        return event as BorrowedEvent.Log
      default:
        throw new Error('Invalid event type')
    }
  }

  //ok
  protected async _getMovements({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
    eventType,
  }: {
    userAddress: string
    protocolTokenAddress: string
    fromBlock: number
    toBlock: number
    eventType:
      | 'supplied'
      | 'collat-supplied'
      | 'withdrawn'
      | 'collat-withdrawn'
      | 'repaid'
      | 'borrowed'
  }): Promise<MovementsByBlock[]> {
    const morphoAaveV3Contract = MorphoAaveV3__factory.connect(
      protocolTokenAddress,
      this._provider,
    )

    let filter
    switch (eventType) {
      case 'supplied':
        filter = morphoAaveV3Contract.filters.Supplied(undefined, userAddress)
        break
      case 'collat-supplied':
        filter = morphoAaveV3Contract.filters.CollateralSupplied(
          undefined,
          userAddress,
        )
        break
      case 'withdrawn':
        filter = morphoAaveV3Contract.filters.Withdrawn(undefined, userAddress)
        break
      case 'collat-withdrawn':
        filter = morphoAaveV3Contract.filters.CollateralWithdrawn(
          undefined,
          userAddress,
        )
      case 'repaid':
        filter = morphoAaveV3Contract.filters.Repaid(undefined, userAddress)
        break
      case 'borrowed':
        filter = morphoAaveV3Contract.filters.Borrowed(undefined, userAddress)
        break
    }

    const eventResults = await morphoAaveV3Contract.queryFilter(
      filter,
      fromBlock,
      toBlock,
    )

    const movements = await Promise.all(
      eventResults.map(async (event) => {
        const castedEvent = this._castEventToLogType(event, eventType)
        const eventData = this._extractEventData(castedEvent)
        if (!eventData) {
          return null
        }

        const protocolToken = await this._fetchProtocolTokenMetadata(
          eventData.underlying,
        )
        const underlyingTokens = await this._fetchUnderlyingTokensMetadata(
          eventData.underlying,
        )

        const underlyingTokensMovement: Record<string, BaseTokenMovement> = {}
        underlyingTokens.forEach((underlyingToken) => {
          underlyingTokensMovement[underlyingToken.address] = {
            ...underlyingToken,
            transactionHash: event.transactionHash,
            movementValueRaw: eventData.amount,
          }
        })

        return {
          protocolToken: {
            ...protocolToken,
          },
          underlyingTokensMovement,
          blockNumber: event.blockNumber,
        }
      }),
    )
    return movements.filter(
      (movement): movement is MovementsByBlock => movement !== null,
    ) as MovementsByBlock[]
  }

  // ok, clean useless variables
  protected async _getProtocolTokenApr({
    protocolTokenAddress,
    blockNumber,
  }: GetAprInput): Promise<number> {
    const morphoAaveV3 = MorphoAaveV3__factory.connect(
      morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    const pool = AaveV3Pool__factory.connect(this.poolAddress, this._provider)

    const { underlyingToken } = await this._fetchPoolMetadata(
      protocolTokenAddress,
    )
    const positionType = this.getProtocolDetails().positionType

    let rate: bigint

    if (positionType === PositionType.Supply) {
      const [
        {
          idleSupply,
          indexes,
          deltas,
          p2pIndexCursor,
          reserveFactor,
          aToken: aTokenAddress,
        },
        {
          currentLiquidityRate,
          currentVariableBorrowRate,
          liquidityIndex,
          variableBorrowIndex,
        },
      ] = await Promise.all([
        morphoAaveV3.market(underlyingToken.address, {
          blockTag: blockNumber,
        }),
        pool.getReserveData(underlyingToken.address, {
          blockTag: blockNumber,
        }),
      ])

      const aToken = AToken__factory.connect(aTokenAddress, this._provider)

      const supplyOnPool = await aToken.balanceOf(
        morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
        {
          blockTag: blockNumber,
        },
      )

      const proportionIdle =
        idleSupply == 0n
          ? 0n
          : min(
              // To avoid proportionIdle > 1 with rounding errors
              this.__MATH__.ONE,
              this.__MATH__.indexDiv(
                idleSupply,
                this.__MATH__.indexMul(
                  deltas.supply.scaledP2PTotal,
                  indexes.supply.p2pIndex,
                ),
              ),
            )

      const { newP2PSupplyIndex } = this.__IRM__.computeP2PIndexes({
        deltas,
        proportionIdle,
        p2pIndexCursor: p2pIndexCursor,
        reserveFactor: reserveFactor,
        lastBorrowIndexes: {
          poolIndex: indexes.borrow.poolIndex,
          p2pIndex: indexes.borrow.p2pIndex,
        },
        lastSupplyIndexes: {
          poolIndex: indexes.supply.poolIndex,
          p2pIndex: indexes.supply.p2pIndex,
        },
        poolBorrowIndex: variableBorrowIndex,
        poolSupplyIndex: liquidityIndex,
      })

      const supplyInP2P = this.__MATH__.indexMul(
        deltas.supply.scaledP2PTotal,
        newP2PSupplyIndex,
      )

      const totalSupply = supplyInP2P + supplyOnPool

      const p2pSupplyRate = this.__IRM__.computeP2PSupplyRatePerYear({
        p2pIndex: newP2PSupplyIndex,
        proportionIdle,
        p2pIndexCursor: p2pIndexCursor,
        reserveFactor: reserveFactor,
        delta: deltas.supply,
        poolBorrowRatePerYear: currentVariableBorrowRate,
        poolSupplyRatePerYear: currentLiquidityRate,
        poolIndex: liquidityIndex,
      })
      rate =
        totalSupply == 0n
          ? currentLiquidityRate
          : RayMath.rayDiv(
              RayMath.rayMul(p2pSupplyRate, supplyInP2P) +
                RayMath.rayMul(currentLiquidityRate, supplyOnPool),
              totalSupply,
            )
    } else {
      const [
        {
          idleSupply,
          indexes,
          deltas,
          p2pIndexCursor,
          reserveFactor,
          aToken: aTokenAddress,
          variableDebtToken: variableDebtTokenAddress,
        },
        {
          currentLiquidityRate,
          currentVariableBorrowRate,
          liquidityIndex,
          variableBorrowIndex,
        },
      ] = await Promise.all([
        morphoAaveV3.market(protocolTokenAddress, {
          blockTag: blockNumber,
        }),
        pool.getReserveData(protocolTokenAddress, {
          blockTag: blockNumber,
        }),
      ])

      const variableDebtToken = AToken__factory.connect(
        variableDebtTokenAddress,
        this._provider,
      )

      const borrowOnPool = await variableDebtToken.balanceOf(
        morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
        {
          blockTag: blockNumber,
        },
      )

      const proportionIdle =
        idleSupply == 0n
          ? 0n
          : min(
              // To avoid proportionIdle > 1 with rounding errors
              this.__MATH__.ONE,
              this.__MATH__.indexDiv(
                idleSupply,
                this.__MATH__.indexMul(
                  deltas.supply.scaledP2PTotal,
                  indexes.supply.p2pIndex,
                ),
              ),
            )

      const { newP2PBorrowIndex } = this.__IRM__.computeP2PIndexes({
        deltas,
        proportionIdle,
        p2pIndexCursor: p2pIndexCursor,
        reserveFactor: reserveFactor,
        lastBorrowIndexes: {
          poolIndex: indexes.borrow.poolIndex,
          p2pIndex: indexes.borrow.p2pIndex,
        },
        lastSupplyIndexes: {
          poolIndex: indexes.supply.poolIndex,
          p2pIndex: indexes.supply.p2pIndex,
        },
        poolBorrowIndex: variableBorrowIndex,
        poolSupplyIndex: liquidityIndex,
      })

      const borrowInP2P = this.__MATH__.indexMul(
        deltas.borrow.scaledP2PTotal,
        newP2PBorrowIndex,
      )
      const totalBorrow = borrowInP2P + borrowOnPool
      const p2pBorrowRate = this.__IRM__.computeP2PBorrowRatePerYear({
        p2pIndex: newP2PBorrowIndex,
        poolSupplyRatePerYear: currentLiquidityRate,
        poolIndex: variableBorrowIndex,
        poolBorrowRatePerYear: currentVariableBorrowRate,
        delta: deltas.borrow,
        reserveFactor: reserveFactor,
        p2pIndexCursor: p2pIndexCursor,
        proportionIdle,
      })
      rate =
        totalBorrow == 0n
          ? currentVariableBorrowRate
          : RayMath.rayDiv(
              RayMath.rayMul(p2pBorrowRate, borrowInP2P) +
                RayMath.rayMul(currentVariableBorrowRate, borrowOnPool),
              totalBorrow,
            )
    }
    return Number(rate) / RAY
  }

  // ok
  async getApr({
    protocolTokenAddress,
    blockNumber,
  }: GetAprInput): Promise<ProtocolTokenApr> {
    const apr = await this._getProtocolTokenApr({
      protocolTokenAddress,
      blockNumber,
    })
    return {
      ...(await this._fetchProtocolTokenMetadata(protocolTokenAddress)),
      aprDecimal: apr * 100,
    }
  }

  // ok
  async getApy({
    protocolTokenAddress,
    blockNumber,
  }: GetApyInput): Promise<ProtocolTokenApy> {
    const apr = await this._getProtocolTokenApr({
      protocolTokenAddress,
      blockNumber,
    })
    const apy = aprToApy(apr, SECONDS_PER_YEAR)

    return {
      ...(await this._fetchProtocolTokenMetadata(protocolTokenAddress)),
      apyDecimal: apy * 100,
    }
  }
}
