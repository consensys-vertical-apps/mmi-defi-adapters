import { getAddress } from 'ethers'
import { min } from 'evm-maths/lib/utils'
import { AdaptersController } from '../../../core/adaptersController'
import { ZERO_ADDRESS } from '../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../core/constants/chains'
import { CacheToDb } from '../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../core/errors/errors'
import { Helpers } from '../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../types/adapter'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import {
  AToken__factory,
  AaveV3Pool__factory,
  MorphoAaveV3__factory,
} from '../../morpho-aave-v2/contracts'
import { SuppliedEvent } from '../../morpho-aave-v2/contracts/MorphoAaveV3'
import {
  TypedContractEvent,
  TypedDeferredTopicFilter,
} from '../../morpho-aave-v2/contracts/common'
import { Protocol } from '../../protocols'
import { MorphoAaveMath } from '../internal-utils/AaveV3.maths'
import P2PInterestRates from '../internal-utils/P2PInterestRates'

const morphoAaveV3ContractAddresses: Partial<
  Record<Protocol, Partial<Record<Chain, string>>>
> = {
  [Protocol.MorphoAaveV3]: {
    [Chain.Ethereum]: getAddress('0x33333aea097c193e66081e930c33020272b33333'),
  },
}

export abstract class MorphoBasePoolAdapter implements IProtocolAdapter {
  abstract productId: string
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  abstract adapterSettings: AdapterSettings

  private provider: CustomJsonRpcProvider

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

  __IRM__ = new P2PInterestRates()
  __MATH__ = new MorphoAaveMath()
  oracleAddress = getAddress('0xA50ba011c48153De246E5192C8f9258A2ba79Ca9')
  poolAddress = getAddress('0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2')

  adaptersController: AdaptersController

  abstract getProtocolDetails(): ProtocolDetails

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const morphoAaveV3Contract = MorphoAaveV3__factory.connect(
      morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
      this.provider,
    )

    const markets = await morphoAaveV3Contract.marketsCreated()
    const positionType = this.getProtocolDetails().positionType
    return await Promise.all(
      markets.map(async (marketAddress) => {
        // Morpho AaveV3-ETH Optimizer allows a borrow only on WETH
        if (positionType === PositionType.Borrow) {
          const [protocolToken, underlyingToken] = await Promise.all([
            getTokenMetadata(
              '0x4d5f47fa6a74757f35c14fd3a6ef8e3c9bc514e8',
              this.chainId,
              this.provider,
            ),
            getTokenMetadata(
              '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
              this.chainId,
              this.provider,
            ),
          ])
          return {
            ...protocolToken,
            underlyingTokens: [underlyingToken],
          }
        }

        const pool = AaveV3Pool__factory.connect(
          this.poolAddress,
          this.provider,
        )
        const aTokenAddress = (await pool.getReserveData(marketAddress))
          .aTokenAddress

        const aTokenContract = AToken__factory.connect(
          aTokenAddress,
          this.provider,
        )

        const supplyTokenAddress = await aTokenContract
          .UNDERLYING_ASSET_ADDRESS()
          .catch((err) => {
            if (err) return ZERO_ADDRESS
            throw err
          })

        const [protocolToken, underlyingToken] = await Promise.all([
          getTokenMetadata(aTokenAddress, this.chainId, this.provider),
          getTokenMetadata(supplyTokenAddress, this.chainId, this.provider),
        ])

        return {
          ...protocolToken,
          underlyingTokens: [underlyingToken],
        }
      }),
    )
  }

  private async getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const {
      underlyingTokens: [underlyingToken],
    } = await this.getProtocolTokenByAddress(protocolTokenBalance.address)

    const underlyingTokenBalance = {
      ...underlyingToken!,
      balanceRaw: protocolTokenBalance.balanceRaw,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const morphoAaveV3 = MorphoAaveV3__factory.connect(
      morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
      this.provider,
    )

    const tokens = await this.getProtocolTokens()
    const positionType = this.getProtocolDetails().positionType

    const getBalance = async (
      market: Erc20Metadata,
      userAddress: string,
      blockNumber: number,
    ): Promise<bigint> => {
      let balanceRaw: bigint
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
        const {
          underlyingTokens: [underlyingToken],
        } = await this.getProtocolTokenByAddress(market.address)

        const amount = await getBalance(
          underlyingToken!,
          userAddress,
          blockNumber!,
        )
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
          const protocolToken = await this.getProtocolTokenByAddress(
            protocolTokenBalance.address,
          )

          const completeTokenBalance: TokenBalance = {
            address: protocolTokenBalance.address,
            balanceRaw: protocolTokenBalance.balance,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
          }

          const underlyingTokenBalances = await this.getUnderlyingTokenBalances(
            {
              userAddress,
              protocolTokenBalance: completeTokenBalance,
              blockNumber,
            },
          )

          return {
            ...protocolTokenBalance,
            balanceRaw: protocolTokenBalance.balance,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
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
    return (
      await Promise.all([
        this.getMovements({
          userAddress,
          protocolTokenAddress,
          fromBlock,
          toBlock,
          eventType: 'withdrawn',
        }),
        this.getMovements({
          userAddress,
          protocolTokenAddress,
          fromBlock,
          toBlock,
          eventType: 'collat-withdrawn',
        }),
      ])
    ).flat()
  }

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return (
      await Promise.all([
        this.getMovements({
          userAddress,
          protocolTokenAddress,
          fromBlock,
          toBlock,
          eventType: 'supplied',
        }),
        this.getMovements({
          userAddress,
          protocolTokenAddress,
          fromBlock,
          toBlock,
          eventType: 'collat-supplied',
        }),
      ])
    ).flat()
  }

  async getBorrows({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.getMovements({
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
    return this.getMovements({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'repaid',
    })
  }

  async getTotalValueLocked({
    blockNumber,
    protocolTokenAddresses,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const tokens = await this.getProtocolTokens()

    const morphoAaveV3 = MorphoAaveV3__factory.connect(
      morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
      this.provider,
    )

    const pool = AaveV3Pool__factory.connect(this.poolAddress, this.provider)
    const positionType = this.getProtocolDetails().positionType
    const result = await Promise.all(
      tokens.map(async (tokenMetadata) => {
        if (
          protocolTokenAddresses &&
          !protocolTokenAddresses.includes(tokenMetadata.address)
        ) {
          return undefined
        }

        let totalValueRaw: bigint
        const {
          underlyingTokens: [underlyingToken],
        } = await this.getProtocolTokenByAddress(tokenMetadata.address)

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
            morphoAaveV3.market(underlyingToken!.address, {
              blockTag: blockNumber,
            }),
            pool.getReserveData(underlyingToken!.address, {
              blockTag: blockNumber,
            }),
          ])

          const aToken = AToken__factory.connect(aTokenAddress, this.provider)

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
              variableDebtToken: variableDebtTokenAddress,
            },
            { liquidityIndex, variableBorrowIndex },
          ] = await Promise.all([
            morphoAaveV3.market(underlyingToken!.address, {
              blockTag: blockNumber,
            }),
            pool.getReserveData(underlyingToken!.address, {
              blockTag: blockNumber,
            }),
          ])

          const variableDebtToken = AToken__factory.connect(
            variableDebtTokenAddress,
            this.provider,
          )

          const borrowOnPool = await variableDebtToken.balanceOf(
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
          address: tokenMetadata.address,
          symbol: tokenMetadata.symbol,
          name: tokenMetadata.name,
          decimals: tokenMetadata.decimals,
          type: TokenType.Protocol,
          totalSupplyRaw: totalValueRaw !== undefined ? totalValueRaw : 0n,
        }
      }),
    )

    return result.filter((result): result is ProtocolTokenTvl =>
      Boolean(result),
    )
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }

  private async getMovements({
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
      morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
      this.provider,
    )

    const {
      underlyingTokens: [underlyingToken],
      ...protocolToken
    } = await this.getProtocolTokenByAddress(protocolTokenAddress)

    let filter: TypedDeferredTopicFilter<
      TypedContractEvent<
        SuppliedEvent.InputTuple,
        SuppliedEvent.OutputTuple,
        SuppliedEvent.OutputObject
      >
    >
    switch (eventType) {
      case 'supplied':
        filter = morphoAaveV3Contract.filters.Supplied(
          undefined,
          userAddress,
          underlyingToken?.address,
        )
        break
      case 'collat-supplied':
        filter = morphoAaveV3Contract.filters.CollateralSupplied(
          undefined,
          userAddress,
          underlyingToken?.address,
        )
        break
      case 'withdrawn':
        filter = morphoAaveV3Contract.filters.Withdrawn(
          undefined,
          userAddress,
          undefined,
          underlyingToken?.address,
        )
        break
      case 'collat-withdrawn':
        filter = morphoAaveV3Contract.filters.CollateralWithdrawn(
          undefined,
          userAddress,
          undefined,
          underlyingToken?.address,
        )
        break
      case 'repaid':
        filter = morphoAaveV3Contract.filters.Repaid(
          undefined,
          userAddress,
          underlyingToken?.address,
        )
        break
      case 'borrowed':
        filter = morphoAaveV3Contract.filters.Borrowed(
          undefined,
          userAddress,
          undefined,
          underlyingToken?.address,
        )
        break
    }

    const eventResults = await morphoAaveV3Contract.queryFilter(
      filter,
      fromBlock,
      toBlock,
    )

    const movements = await Promise.all(
      eventResults.map(async (event) => {
        const eventData = event.args

        return {
          protocolToken,
          tokens: [
            {
              ...underlyingToken!,
              balanceRaw: eventData.amount,
              type: TokenType.Underlying,
            },
          ],
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        }
      }),
    )

    return movements
  }

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }
}

// NOTE: The APY/APR feature has been removed as of March 2024.
// The below contains logic that may be useful for future features or reference. For more context on this decision, refer to ticket [MMI-4731].

// async getApr({
//   protocolTokenAddress,
//   blockNumber,
// }: GetAprInput): Promise<ProtocolTokenApr> {
//   const apr = await this.getProtocolTokenApr({
//     protocolTokenAddress,
//     blockNumber,
//   })
//   return {
//     ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
//     aprDecimal: apr * 100,
//   }
// }

// async getApy({
//   protocolTokenAddress,
//   blockNumber,
// }: GetApyInput): Promise<ProtocolTokenApy> {
//   const apr = await this.getProtocolTokenApr({
//     protocolTokenAddress,
//     blockNumber,
//   })
//   const apy = aprToApy(apr, SECONDS_PER_YEAR)

//   return {
//     ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
//     apyDecimal: apy * 100,
//   }
// }

// private async getProtocolTokenApr({
//   protocolTokenAddress,
//   blockNumber,
// }: GetAprInput): Promise<number> {
//   const morphoAaveV3 = MorphoAaveV3__factory.connect(
//     morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
//     this.provider,
//   )

//   const pool = AaveV3Pool__factory.connect(this.poolAddress, this.provider)

//   const { underlyingToken } = await this.fetchPoolMetadata(
//     protocolTokenAddress,
//   )
//   const positionType = this.getProtocolDetails().positionType

//   let rate: bigint

//   if (positionType === PositionType.Supply) {
//     const [
//       {
//         idleSupply,
//         indexes,
//         deltas,
//         p2pIndexCursor,
//         reserveFactor,
//         aToken: aTokenAddress,
//       },
//       {
//         currentLiquidityRate,
//         currentVariableBorrowRate,
//         liquidityIndex,
//         variableBorrowIndex,
//       },
//     ] = await Promise.all([
//       morphoAaveV3.market(underlyingToken.address, {
//         blockTag: blockNumber,
//       }),
//       pool.getReserveData(underlyingToken.address, {
//         blockTag: blockNumber,
//       }),
//     ])

//     const aToken = AToken__factory.connect(aTokenAddress, this.provider)

//     const supplyOnPool = await aToken.balanceOf(
//       morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
//       {
//         blockTag: blockNumber,
//       },
//     )

//     const proportionIdle =
//       idleSupply === 0n
//         ? 0n
//         : min(
//             // To avoid proportionIdle > 1 with rounding errors
//             this.__MATH__.ONE,
//             this.__MATH__.indexDiv(
//               idleSupply,
//               this.__MATH__.indexMul(
//                 deltas.supply.scaledP2PTotal,
//                 indexes.supply.p2pIndex,
//               ),
//             ),
//           )

//     const { newP2PSupplyIndex } = this.__IRM__.computeP2PIndexes({
//       deltas,
//       proportionIdle,
//       p2pIndexCursor: p2pIndexCursor,
//       reserveFactor: reserveFactor,
//       lastBorrowIndexes: {
//         poolIndex: indexes.borrow.poolIndex,
//         p2pIndex: indexes.borrow.p2pIndex,
//       },
//       lastSupplyIndexes: {
//         poolIndex: indexes.supply.poolIndex,
//         p2pIndex: indexes.supply.p2pIndex,
//       },
//       poolBorrowIndex: variableBorrowIndex,
//       poolSupplyIndex: liquidityIndex,
//     })

//     const supplyInP2P = this.__MATH__.indexMul(
//       deltas.supply.scaledP2PTotal,
//       newP2PSupplyIndex,
//     )

//     const totalSupply = supplyInP2P + supplyOnPool

//     const p2pSupplyRate = this.__IRM__.computeP2PSupplyRatePerYear({
//       p2pIndex: newP2PSupplyIndex,
//       proportionIdle,
//       p2pIndexCursor: p2pIndexCursor,
//       reserveFactor: reserveFactor,
//       delta: deltas.supply,
//       poolBorrowRatePerYear: currentVariableBorrowRate,
//       poolSupplyRatePerYear: currentLiquidityRate,
//       poolIndex: liquidityIndex,
//     })
//     rate =
//       totalSupply === 0n
//         ? currentLiquidityRate
//         : RayMath.rayDiv(
//             this.__MATH__.indexMul(p2pSupplyRate, supplyInP2P) +
//               this.__MATH__.indexMul(currentLiquidityRate, supplyOnPool),
//             totalSupply,
//           )
//   } else {
//     const [
//       {
//         idleSupply,
//         indexes,
//         deltas,
//         p2pIndexCursor,
//         reserveFactor,
//         variableDebtToken: variableDebtTokenAddress,
//       },
//       {
//         currentLiquidityRate,
//         currentVariableBorrowRate,
//         liquidityIndex,
//         variableBorrowIndex,
//       },
//     ] = await Promise.all([
//       morphoAaveV3.market(underlyingToken.address, {
//         blockTag: blockNumber,
//       }),
//       pool.getReserveData(underlyingToken.address, {
//         blockTag: blockNumber,
//       }),
//     ])

//     const variableDebtToken = AToken__factory.connect(
//       variableDebtTokenAddress,
//       this.provider,
//     )

//     const borrowOnPool = await variableDebtToken.balanceOf(
//       morphoAaveV3ContractAddresses[this.protocolId]![this.chainId]!,
//       {
//         blockTag: blockNumber,
//       },
//     )

//     const proportionIdle =
//       idleSupply === 0n
//         ? 0n
//         : min(
//             // To avoid proportionIdle > 1 with rounding errors
//             this.__MATH__.ONE,
//             this.__MATH__.indexDiv(
//               idleSupply,
//               this.__MATH__.indexMul(
//                 deltas.supply.scaledP2PTotal,
//                 indexes.supply.p2pIndex,
//               ),
//             ),
//           )

//     const { newP2PBorrowIndex } = this.__IRM__.computeP2PIndexes({
//       deltas,
//       proportionIdle,
//       p2pIndexCursor: p2pIndexCursor,
//       reserveFactor: reserveFactor,
//       lastBorrowIndexes: {
//         poolIndex: indexes.borrow.poolIndex,
//         p2pIndex: indexes.borrow.p2pIndex,
//       },
//       lastSupplyIndexes: {
//         poolIndex: indexes.supply.poolIndex,
//         p2pIndex: indexes.supply.p2pIndex,
//       },
//       poolBorrowIndex: variableBorrowIndex,
//       poolSupplyIndex: liquidityIndex,
//     })

//     const borrowInP2P = this.__MATH__.indexMul(
//       deltas.borrow.scaledP2PTotal,
//       newP2PBorrowIndex,
//     )
//     const totalBorrow = borrowInP2P + borrowOnPool
//     const p2pBorrowRate = this.__IRM__.computeP2PBorrowRatePerYear({
//       p2pIndex: newP2PBorrowIndex,
//       poolSupplyRatePerYear: currentLiquidityRate,
//       poolIndex: variableBorrowIndex,
//       poolBorrowRatePerYear: currentVariableBorrowRate,
//       delta: deltas.borrow,
//       reserveFactor: reserveFactor,
//       p2pIndexCursor: p2pIndexCursor,
//       proportionIdle,
//     })
//     rate =
//       totalBorrow === 0n
//         ? currentVariableBorrowRate
//         : RayMath.rayDiv(
//             this.__MATH__.indexMul(p2pBorrowRate, borrowInP2P) +
//               this.__MATH__.indexMul(currentVariableBorrowRate, borrowOnPool),
//             totalBorrow,
//           )
//   }
//   return Number(rate) / RAY
// }
