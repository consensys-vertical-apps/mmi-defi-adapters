import { MaxUint256, formatUnits } from 'ethers'
import * as RayMath from 'evm-maths/lib/ray'
import * as PercentMath from 'evm-maths/lib/percent'
import * as constants from 'evm-maths/lib/constants'
import { AdaptersController } from '../../../core/adaptersController'
import { Chain } from '../../../core/constants/chains'
import { RAY } from '../../../core/constants/RAY'
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
  AaveV3Oracle__factory,
} from '../../morpho-aave-v2/contracts'
import {
  SuppliedEvent,
  CollateralSuppliedEvent,
  WithdrawnEvent,
  BorrowedEvent,
  RepaidEvent,
} from '../../morpho-aave-v2/contracts/MorphoAaveV3'
import { min, max } from 'lodash'

type MorphoAaveV3PeerToPoolAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
  }
>

type P2PRateComputeParams = {
  /** The pool supply rate per year (in ray). */
  poolSupplyRatePerYear: bigint

  /** The pool borrow rate per year (in ray). */
  poolBorrowRatePerYear: bigint

  /** The last stored pool index (in ray). */
  poolIndex: bigint

  /** The last stored peer-to-peer index (in ray). */
  p2pIndex: bigint

  /**  The delta amount in pool unit. */
  p2pDelta: bigint

  /**  The total peer-to-peer amount in peer-to-peer unit. */
  p2pAmount: bigint

  /** The index cursor of the given market (in bps). */
  p2pIndexCursor: bigint

  /** The reserve factor of the given market (in bps). */
  reserveFactor: bigint

  /** The proportion idle of the given market (in underlying). */
  proportionIdle: bigint
}

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

  oracleAddress = '0xA50ba011c48153De246E5192C8f9258A2ba79Ca9'
  poolAddress = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'

  adaptersController: AdaptersController

  abstract getProtocolDetails(): ProtocolDetails

  private _metadataCache: MorphoAaveV3PeerToPoolAdapterMetadata | null = null

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
        const aTokenContract = AToken__factory.connect(
          marketAddress,
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
          getTokenMetadata(marketAddress, this.chainId, this._provider),
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

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  protected async _fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this._fetchPoolMetadata(
      protocolTokenAddress,
    )

    return protocolToken
  }

  private async _fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

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

  protected async _fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken } = await this._fetchPoolMetadata(
      protocolTokenAddress,
    )

    return [underlyingToken]
  }

  // async getPositions({
  //   userAddress,
  //   blockNumber,
  // }: GetPositionsInput): Promise<ProtocolPosition[]> {
  //   const lensContract = MorphoAaveV2Lens__factory.connect(
  //     this.lensAddress,
  //     this._provider,
  //   )
  //   const tokens = await this.getProtocolTokens()
  //   const positionType = this.getProtocolDetails().positionType

  //   const getBalance = async (
  //     market: Erc20Metadata,
  //     userAddress: string,
  //     blockNumber: number,
  //   ): Promise<bigint> => {
  //     let balanceRaw
  //     if (positionType === PositionType.Supply) {
  //       ;[, , balanceRaw] = await lensContract.getCurrentSupplyBalanceInOf(
  //         market.address,
  //         userAddress,
  //         { blockTag: blockNumber },
  //       )
  //     } else {
  //       ;[, , balanceRaw] = await lensContract.getCurrentBorrowBalanceInOf(
  //         market.address,
  //         userAddress,
  //         { blockTag: blockNumber },
  //       )
  //     }
  //     return balanceRaw
  //   }

  //   const protocolTokensBalances = await Promise.all(
  //     tokens.map(async (market) => {
  //       const amount = await getBalance(market, userAddress, blockNumber!)
  //       return {
  //         address: market.address,
  //         balance: amount,
  //       }
  //     }),
  //   )

  //   const protocolTokens: ProtocolPosition[] = await Promise.all(
  //     protocolTokensBalances
  //       .filter((protocolTokenBalance) => protocolTokenBalance.balance !== 0n) // Filter out balances equal to 0
  //       .map(async (protocolTokenBalance) => {
  //         const tokenMetadata = await this._fetchProtocolTokenMetadata(
  //           protocolTokenBalance.address,
  //         )

  //         const completeTokenBalance: TokenBalance = {
  //           address: protocolTokenBalance.address,
  //           balanceRaw: protocolTokenBalance.balance,
  //           name: tokenMetadata.name,
  //           symbol: tokenMetadata.symbol,
  //           decimals: tokenMetadata.decimals,
  //         }

  //         const underlyingTokenBalances =
  //           await this._getUnderlyingTokenBalances({
  //             userAddress,
  //             protocolTokenBalance: completeTokenBalance,
  //             blockNumber,
  //           })

  //         return {
  //           ...protocolTokenBalance,
  //           balanceRaw: protocolTokenBalance.balance,
  //           name: tokenMetadata.name,
  //           symbol: tokenMetadata.symbol,
  //           decimals: tokenMetadata.decimals,
  //           type: TokenType.Protocol,
  //           tokens: underlyingTokenBalances,
  //         }
  //       }),
  //   )
  //   return protocolTokens
  // }

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
      eventType: 'supplied' || 'collateralSupplied',
    })
  }

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

  // async getProfits({
  //   userAddress,
  //   fromBlock,
  //   toBlock,
  // }: GetProfitsInput): Promise<ProfitsWithRange> {
  //   // Fetch end and start position values
  //   const positionType = this.getProtocolDetails().positionType

  //   const [endPositionValues, startPositionValues] = await Promise.all([
  //     this.getPositions({
  //       userAddress,
  //       blockNumber: toBlock,
  //     }).then(formatProtocolTokenArrayToMap),
  //     this.getPositions({
  //       userAddress,
  //       blockNumber: fromBlock,
  //     }).then(formatProtocolTokenArrayToMap),
  //   ])

  //   // Fetch and process each token's movements
  //   const tokens = await Promise.all(
  //     Object.values(endPositionValues).map(
  //       async ({
  //         protocolTokenMetadata,
  //         underlyingTokenPositions: underlyingEndPositions,
  //       }) => {
  //         const getEventsInput: GetEventsInput = {
  //           userAddress,
  //           protocolTokenAddress: protocolTokenMetadata.address,
  //           fromBlock,
  //           toBlock,
  //         }
  //         let eventsOut: Record<string, bigint>
  //         let eventsIn: Record<string, bigint>

  //         if (positionType === PositionType.Supply) {
  //           ;[eventsOut, eventsIn] = await Promise.all([
  //             this.getWithdrawals(getEventsInput).then(aggregateTrades),
  //             this.getDeposits(getEventsInput).then(aggregateTrades),
  //           ])
  //         } else {
  //           ;[eventsOut, eventsIn] = await Promise.all([
  //             this.getBorrows(getEventsInput).then(aggregateTrades),
  //             this.getRepays(getEventsInput).then(aggregateTrades),
  //           ])
  //         }

  //         return {
  //           ...protocolTokenMetadata,
  //           type: TokenType.Protocol,
  //           tokens: Object.values(underlyingEndPositions).map(
  //             ({
  //               address,
  //               name,
  //               symbol,
  //               decimals,
  //               balanceRaw: endPositionValueRaw,
  //             }) => {
  //               const startPositionValueRaw =
  //                 startPositionValues[protocolTokenMetadata.address]
  //                   ?.underlyingTokenPositions[address]?.balanceRaw ?? 0n

  //               const calculationData = {
  //                 outRaw: eventsOut[address] ?? 0n,
  //                 inRaw: eventsIn[address] ?? 0n,
  //                 endPositionValueRaw: endPositionValueRaw ?? 0n,
  //                 startPositionValueRaw,
  //               }

  //               let profitRaw =
  //                 calculationData.endPositionValueRaw +
  //                 calculationData.outRaw -
  //                 calculationData.inRaw -
  //                 calculationData.startPositionValueRaw

  //               if (
  //                 this.getProtocolDetails().positionType === PositionType.Borrow
  //               ) {
  //                 profitRaw *= -1n
  //               }

  //               return {
  //                 address,
  //                 name,
  //                 symbol,
  //                 decimals,
  //                 profitRaw,
  //                 type: TokenType.Underlying,
  //                 calculationData: {
  //                   withdrawalsRaw: eventsOut[address] ?? 0n,
  //                   withdrawals: formatUnits(
  //                     eventsOut[address] ?? 0n,
  //                     decimals,
  //                   ),
  //                   depositsRaw: eventsIn[address] ?? 0n,
  //                   deposits: formatUnits(eventsIn[address] ?? 0n, decimals),
  //                   startPositionValueRaw: startPositionValueRaw ?? 0n,
  //                   startPositionValue: formatUnits(
  //                     startPositionValueRaw ?? 0n,
  //                     decimals,
  //                   ),
  //                   endPositionValueRaw,
  //                   endPositionValue: formatUnits(
  //                     endPositionValueRaw ?? 0n,
  //                     decimals,
  //                   ),
  //                 },
  //               }
  //             },
  //           ),
  //         }
  //       },
  //     ),
  //   )

  //   return { tokens, fromBlock, toBlock }
  // }

  async getTotalValueLocked({
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const tokens = await this.getProtocolTokens()

    const morphoAaveV3 = MorphoAaveV3__factory.connect(
      morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )
    const oracle = AaveV3Oracle__factory.connect(
      this.oracleAddress,
      this._provider,
    )

    const positionType = this.getProtocolDetails().positionType
    return Promise.all(
      tokens.map(async (tokenMetadata) => {
        let totalValueRaw

        if (positionType === PositionType.Supply) {
          //
          const [
            {
              aToken: aTokenAddress,
              indexes: {
                supply: { p2pIndex, poolIndex },
              },
              deltas: {
                supply: { scaledDelta, scaledP2PTotal },
              },
              idleSupply,
            },
            underlyingPrice,
          ] = await Promise.all([
            morphoAaveV3.market(tokenMetadata.address, {
              blockTag: blockNumber,
            }), // right toaddress???? TODOS
            oracle.getAssetPrice(tokenMetadata.address, {
              blockTag: blockNumber,
            }),
          ])

          const aToken = AToken__factory.connect(aTokenAddress, this._provider)

          const poolSupplyAmount = await aToken.balanceOf(
            morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
            {
              blockTag: blockNumber,
            },
          )
          let p2pSupplyAmount = max([
            0n,
            RayMath.rayMul(scaledP2PTotal, p2pIndex) -
              RayMath.rayMul(scaledDelta, poolIndex),
          ])
          if (p2pSupplyAmount !== undefined) {
            totalValueRaw = idleSupply + poolSupplyAmount + p2pSupplyAmount
          } else {
            totalValueRaw = idleSupply + poolSupplyAmount
          }
        } else {
          // TODOS the borrow
          totalValueRaw = 0n
        }

        return {
          ...tokenMetadata,
          type: TokenType.Protocol,
          totalSupplyRaw: totalValueRaw !== undefined ? totalValueRaw : 0n,
        }
      }),
    )
  }

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

  protected _extractEventData(
    eventLog:
      | SuppliedEvent.Log
      | WithdrawnEvent.Log
      | RepaidEvent.Log
      | BorrowedEvent.Log,
  ) {
    return eventLog.args
  }

  protected _castEventToLogType(
    event: unknown,
    eventType: 'supplied' | 'withdrawn' | 'repaid' | 'borrowed',
  ):
    | SuppliedEvent.Log
    | WithdrawnEvent.Log
    | RepaidEvent.Log
    | BorrowedEvent.Log {
    switch (eventType) {
      case 'supplied':
        return event as SuppliedEvent.Log
      case 'withdrawn':
        return event as WithdrawnEvent.Log
      case 'repaid':
        return event as RepaidEvent.Log
      case 'borrowed':
        return event as BorrowedEvent.Log
      default:
        throw new Error('Invalid event type')
    }
  }

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
    eventType: 'supplied' | 'withdrawn' | 'repaid' | 'borrowed'
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
      case 'withdrawn':
        filter = morphoAaveV3Contract.filters.Withdrawn(userAddress)
        break
      case 'repaid':
        filter = morphoAaveV3Contract.filters.Repaid(undefined, userAddress)
        break
      case 'borrowed':
        filter = morphoAaveV3Contract.filters.Borrowed(userAddress)
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
            movementValueRaw: eventData._amount,
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

  protected async _getProtocolTokenApr({
    protocolTokenAddress,
    blockNumber,
  }: GetAprInput): Promise<number> {
    const morphoAaveV3 = MorphoAaveV3__factory.connect(
      morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    const pool = AaveV3Pool__factory.connect(this.oracleAddress, this._provider)

    const { underlyingToken } = await this._fetchPoolMetadata(
      protocolTokenAddress,
    )
    const positionType = this.getProtocolDetails().positionType

    if (positionType === PositionType.Supply) {
      const [
        { currentLiquidityRate, currentVariableBorrowRate },
        {
          idleSupply,
          deltas: {
            supply: { scaledDelta, scaledP2PTotal },
          },
          indexes: {
            supply: { p2pIndex, poolIndex },
          },
          reserveFactor,
          p2pIndexCursor,
        },
      ] = await Promise.all([
        pool.getReserveData(underlyingToken.address, {
          blockTag: blockNumber,
        }),
        morphoAaveV3.market(underlyingToken.address, {
          blockTag: blockNumber,
        }),
      ])

      const totalP2PSupplied: bigint =
        (scaledP2PTotal * p2pIndex) / constants.RAY
      const propIdleSupply: bigint =
        (idleSupply * constants.RAY) / totalP2PSupplied
      const p2pSupplyRate = await this.getP2PSupplyRate({
        poolSupplyRatePerYear: currentLiquidityRate,
        poolBorrowRatePerYear: currentVariableBorrowRate,
        poolIndex,
        p2pIndex,
        proportionIdle: propIdleSupply,
        p2pDelta: scaledDelta,
        p2pAmount: scaledP2PTotal,
        p2pIndexCursor: BigInt(p2pIndexCursor),
        reserveFactor: BigInt(reserveFactor),
      })

      return Number(p2pSupplyRate) / RAY
    } else {
      const [
        { currentLiquidityRate, currentVariableBorrowRate },
        {
          deltas: {
            borrow: { scaledDelta, scaledP2PTotal },
          },
          indexes: {
            borrow: { p2pIndex, poolIndex },
          },
          reserveFactor,
          p2pIndexCursor,
        },
      ] = await Promise.all([
        pool.getReserveData(underlyingToken.address, {
          blockTag: blockNumber,
        }),
        morphoAaveV3.market(underlyingToken.address, {
          blockTag: blockNumber,
        }),
      ])

      const p2pBorrowRate = await this.getP2PBorrowRate({
        poolSupplyRatePerYear: currentLiquidityRate,
        poolBorrowRatePerYear: currentVariableBorrowRate,
        poolIndex,
        p2pIndex,
        proportionIdle: 0n,
        p2pDelta: scaledDelta,
        p2pAmount: scaledP2PTotal,
        p2pIndexCursor: BigInt(p2pIndexCursor),
        reserveFactor: BigInt(reserveFactor),
      })
      return Number(p2pBorrowRate) / RAY
    }
  }

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

  protected getP2PSupplyRate = ({
    poolSupplyRatePerYear,
    poolBorrowRatePerYear,
    p2pIndexCursor,
    p2pIndex,
    poolIndex,
    proportionIdle,
    reserveFactor,
    p2pDelta,
    p2pAmount,
  }: P2PRateComputeParams) => {
    let p2pSupplyRate

    if (poolSupplyRatePerYear > poolBorrowRatePerYear)
      p2pSupplyRate = poolBorrowRatePerYear
    else {
      const p2pRate = this.getWeightedAvg(
        poolSupplyRatePerYear,
        poolBorrowRatePerYear,
        p2pIndexCursor,
      )

      p2pSupplyRate =
        p2pRate -
        PercentMath.percentMul(p2pRate - poolBorrowRatePerYear, reserveFactor)
    }

    let proportionDelta: bigint = 0n
    if (p2pDelta > 0n && p2pAmount > 0n) {
      proportionDelta = min([
        RayMath.rayDiv(
          RayMath.rayMul(p2pDelta, poolIndex),
          RayMath.rayMul(p2pAmount, p2pIndex),
        ),
        constants.RAY - proportionIdle,
      ]) as bigint

      p2pSupplyRate =
        RayMath.rayMul(
          p2pSupplyRate,
          constants.RAY - proportionDelta - proportionIdle,
        ) +
        RayMath.rayMul(poolSupplyRatePerYear, proportionDelta) +
        proportionIdle
    }

    return p2pSupplyRate
  }

  protected getP2PBorrowRate = ({
    poolSupplyRatePerYear,
    poolBorrowRatePerYear,
    p2pIndexCursor,
    p2pIndex,
    poolIndex,
    proportionIdle,
    reserveFactor,
    p2pDelta,
    p2pAmount,
  }: P2PRateComputeParams) => {
    let p2pBorrowRate: bigint
    if (poolSupplyRatePerYear > poolBorrowRatePerYear) {
      p2pBorrowRate = poolBorrowRatePerYear
    } else {
      const p2pRate = this.getWeightedAvg(
        poolSupplyRatePerYear,
        poolBorrowRatePerYear,
        p2pIndexCursor,
      )

      p2pBorrowRate =
        p2pRate -
        ((p2pRate - poolBorrowRatePerYear) * reserveFactor) / constants.RAY
    }
    if (p2pDelta > 0n && p2pAmount > 0n) {
      const a = ((p2pDelta * poolIndex) / p2pAmount) * p2pIndex
      const b = constants.RAY
      const shareOfTheDelta = a > b ? b : a
      p2pBorrowRate =
        (p2pBorrowRate * (constants.RAY - shareOfTheDelta)) / constants.RAY +
        (poolBorrowRatePerYear * shareOfTheDelta) / constants.RAY
    }
    return p2pBorrowRate
  }
  protected getWeightedAvg = (x: bigint, y: bigint, percentage: bigint) => {
    const MAX_UINT256_MINUS_HALF_PERCENTAGE_FACTOR =
      MaxUint256 - constants.HALF_PERCENT
    let z: bigint = constants.PERCENT - percentage

    if (
      percentage > constants.PERCENT ||
      (percentage > 0 &&
        y > MAX_UINT256_MINUS_HALF_PERCENTAGE_FACTOR / percentage) ||
      (constants.PERCENT > percentage &&
        x > MAX_UINT256_MINUS_HALF_PERCENTAGE_FACTOR - (y * percentage) / z)
    ) {
      throw new Error('Underflow or overflow detected')
    }

    z = x * z + y * percentage + constants.HALF_PERCENT / constants.PERCENT
    return z
  }
}
