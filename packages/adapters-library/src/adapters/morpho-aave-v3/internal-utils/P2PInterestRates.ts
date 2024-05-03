import * as constants from 'evm-maths/lib/constants'
import * as PercentMath from 'evm-maths/lib/percent'
import * as RayMath from 'evm-maths/lib/ray'
import { min } from 'evm-maths/lib/utils'
import { MorphoAaveMath } from './AaveV3.maths'

export interface MarketSideDelta {
  scaledDelta: bigint // The delta amount in pool unit.
  scaledP2PTotal: bigint // The total peer-to-peer amount in peer-to-peer unit.
}

export interface DeltasStruct {
  supply: MarketSideDelta // The `MarketSideDelta` related to the supply side.
  borrow: MarketSideDelta // The `MarketSideDelta` related to the borrow side.
}

export interface MarketSizeIndexes {
  /** The pool index (in ray). */
  poolIndex: bigint

  /** The peer-to-peer index (in ray). */
  p2pIndex: bigint
}

export interface GrowthFactors {
  /** The pool's supply index growth factor (in ray). */
  poolSupplyGrowthFactor: bigint

  /** Peer-to-peer supply index growth factor (in ray). */
  p2pSupplyGrowthFactor: bigint

  /** The pool's borrow index growth factor (in ray). */
  poolBorrowGrowthFactor: bigint

  /** Peer-to-peer borrow index growth factor (in ray). */
  p2pBorrowGrowthFactor: bigint
}

export interface IndexesParams {
  /** The last stored pool supply index (in ray). */
  lastSupplyIndexes: MarketSizeIndexes

  /** The last stored pool borrow index (in ray). */
  lastBorrowIndexes: MarketSizeIndexes

  /** The current pool supply index (in ray). */
  poolSupplyIndex: bigint

  /** The current pool borrow index (in ray). */
  poolBorrowIndex: bigint

  /** The reserve factor percentage (10 000 = 100%). */
  reserveFactor: bigint

  /** The peer-to-peer index cursor (10 000 = 100%). */
  p2pIndexCursor: bigint

  /** The deltas and peer-to-peer amounts. */
  deltas: DeltasStruct

  /** The amount of proportion idle (in underlying). */
  proportionIdle: bigint
}

export interface RateParams {
  /** The pool supply rate per year (in ray). */
  poolSupplyRatePerYear: bigint

  /** The pool borrow rate per year (in ray). */
  poolBorrowRatePerYear: bigint

  /** The last stored pool index (in ray). */
  poolIndex: bigint

  /** The last stored peer-to-peer index (in ray). */
  p2pIndex: bigint

  /** The delta and peer-to-peer amount. */
  delta: MarketSideDelta

  /** The index cursor of the given market (in bps). */
  p2pIndexCursor: bigint

  /** The reserve factor of the given market (in bps). */
  reserveFactor: bigint

  /** The proportion idle of the given market (in underlying). */
  proportionIdle: bigint
}

export default class P2PInterestRates {
  __MATHS__ = new MorphoAaveMath()

  public computeP2PIndexes({
    p2pIndexCursor,
    lastBorrowIndexes,
    lastSupplyIndexes,
    poolBorrowIndex,
    poolSupplyIndex,
    deltas,
    reserveFactor,
    proportionIdle,
  }: IndexesParams) {
    const {
      poolSupplyGrowthFactor,
      poolBorrowGrowthFactor,
      p2pBorrowGrowthFactor,
      p2pSupplyGrowthFactor,
    } = this._computeGrowthFactors(
      poolSupplyIndex,
      poolBorrowIndex,
      lastSupplyIndexes.poolIndex,
      lastBorrowIndexes.poolIndex,
      p2pIndexCursor,
      reserveFactor,
    )
    const newP2PSupplyIndex = this._computeP2PIndex(
      poolSupplyGrowthFactor,
      p2pSupplyGrowthFactor,
      lastSupplyIndexes,
      BigInt(deltas.supply.scaledDelta),
      BigInt(deltas.supply.scaledP2PTotal),
      proportionIdle,
    )
    const newP2PBorrowIndex = this._computeP2PIndex(
      poolBorrowGrowthFactor,
      p2pBorrowGrowthFactor,
      lastBorrowIndexes,
      BigInt(deltas.borrow.scaledDelta),
      BigInt(deltas.borrow.scaledP2PTotal),
      0n,
    )
    return {
      newP2PSupplyIndex,
      newP2PBorrowIndex,
    }
  }

  public computeP2PSupplyRatePerYear({
    poolSupplyRatePerYear,
    poolBorrowRatePerYear,
    poolIndex,
    p2pIndex,
    p2pIndexCursor,
    reserveFactor,
    proportionIdle,
    delta,
  }: RateParams) {
    let p2pSupplyRate: bigint

    if (poolSupplyRatePerYear > poolBorrowRatePerYear)
      p2pSupplyRate = poolBorrowRatePerYear
    else {
      const p2pRate = this._weightedAverage(
        poolSupplyRatePerYear,
        poolBorrowRatePerYear,
        p2pIndexCursor,
      )

      p2pSupplyRate =
        p2pRate -
        this.__MATHS__.percentMul(
          p2pRate - poolBorrowRatePerYear,
          reserveFactor,
        )
    }

    if (BigInt(delta.scaledDelta) > 0 && BigInt(delta.scaledP2PTotal) > 0) {
      const proportionDelta = min(
        this.__MATHS__.indexDivUp(
          this.__MATHS__.indexMul(BigInt(delta.scaledDelta), poolIndex),
          this.__MATHS__.indexMul(BigInt(delta.scaledP2PTotal), p2pIndex),
        ),
        this.__MATHS__.INDEX_ONE - proportionIdle, // To avoid proportionDelta + proportionIdle > 1 with rounding errors.
      )

      p2pSupplyRate =
        this.__MATHS__.indexMul(
          p2pSupplyRate,
          this.__MATHS__.INDEX_ONE - proportionDelta - proportionIdle,
        ) +
        this.__MATHS__.indexMul(poolSupplyRatePerYear, proportionDelta) +
        proportionIdle
    }

    return p2pSupplyRate / BigInt(1e4)
  }
  public computeP2PBorrowRatePerYear({
    poolSupplyRatePerYear,
    poolBorrowRatePerYear,
    poolIndex,
    p2pIndex,
    p2pIndexCursor,
    reserveFactor,
    proportionIdle,
    delta,
  }: RateParams) {
    let p2pBorrowRate: bigint

    if (poolSupplyRatePerYear > poolBorrowRatePerYear)
      p2pBorrowRate = poolBorrowRatePerYear
    else {
      const p2pRate = this._weightedAverage(
        poolSupplyRatePerYear,
        poolBorrowRatePerYear,
        p2pIndexCursor,
      )

      p2pBorrowRate =
        p2pRate +
        this.__MATHS__.percentMul(
          poolBorrowRatePerYear - p2pRate,
          reserveFactor,
        )
    }

    if (BigInt(delta.scaledDelta) > 0 && BigInt(delta.scaledP2PTotal) > 0) {
      const proportionDelta = min(
        this.__MATHS__.indexDivUp(
          this.__MATHS__.indexMul(BigInt(delta.scaledDelta), poolIndex),
          this.__MATHS__.indexMul(BigInt(delta.scaledP2PTotal), p2pIndex),
        ),
        this.__MATHS__.INDEX_ONE - proportionIdle,
        // To avoid proportionDelta + proportionIdle > 1 with rounding errors.
      )

      p2pBorrowRate =
        this.__MATHS__.indexMul(
          p2pBorrowRate,
          this.__MATHS__.INDEX_ONE - proportionDelta - proportionIdle,
        ) +
        this.__MATHS__.indexMul(poolBorrowRatePerYear, proportionDelta) +
        proportionIdle
    }

    return p2pBorrowRate / BigInt(1e4)
  }

  private _computeGrowthFactors(
    newPoolSupplyIndex: bigint,
    newPoolBorrowIndex: bigint,
    lastPoolSupplyIndex: bigint,
    lastPoolBorrowIndex: bigint,
    p2pIndexCursor: bigint,
    reserveFactor: bigint,
  ): GrowthFactors {
    const poolSupplyGrowthFactor = this.__MATHS__.indexDiv(
      newPoolSupplyIndex,
      lastPoolSupplyIndex,
    )

    const poolBorrowGrowthFactor = this.__MATHS__.indexDiv(
      newPoolBorrowIndex,
      lastPoolBorrowIndex,
    )

    let p2pSupplyGrowthFactor: bigint
    let p2pBorrowGrowthFactor: bigint

    if (poolSupplyGrowthFactor <= poolBorrowGrowthFactor) {
      const p2pGrowthFactor = this._weightedAverage(
        poolSupplyGrowthFactor,
        poolBorrowGrowthFactor,
        p2pIndexCursor,
      )

      p2pSupplyGrowthFactor =
        p2pGrowthFactor -
        PercentMath.percentMul(
          p2pGrowthFactor - poolSupplyGrowthFactor,
          reserveFactor,
        )

      p2pBorrowGrowthFactor =
        p2pGrowthFactor +
        PercentMath.percentMul(
          poolBorrowGrowthFactor - p2pGrowthFactor,
          reserveFactor,
        )
    } else {
      // The case poolSupplyGrowthFactor > poolBorrowGrowthFactor happens because someone has done a flashloan on Aave:
      // the peer-to-peer growth factors are set to the pool borrow growth factor.
      p2pSupplyGrowthFactor = poolBorrowGrowthFactor
      p2pBorrowGrowthFactor = poolBorrowGrowthFactor
    }

    return {
      poolSupplyGrowthFactor,
      p2pSupplyGrowthFactor,
      poolBorrowGrowthFactor,
      p2pBorrowGrowthFactor,
    }
  }

  // Careful, p2pIndex scaled in 1e4
  private _computeP2PIndex(
    poolGrowthFactor: bigint,
    p2pGrowthFactor: bigint,
    lastIndexes: MarketSizeIndexes,
    scaledDelta: bigint,
    scaledP2PTotal: bigint,
    proportionIdle: bigint,
  ): bigint {
    if (scaledP2PTotal === 0n || (scaledDelta === 0n && proportionIdle === 0n))
      return (
        this.__MATHS__.indexMul(lastIndexes.p2pIndex, p2pGrowthFactor) /
        BigInt(1e4)
      )

    const proportionDelta = min(
      RayMath.rayDivUp(
        this.__MATHS__.indexMul(scaledDelta, lastIndexes.poolIndex),
        this.__MATHS__.indexMul(scaledP2PTotal, lastIndexes.p2pIndex),
      ),
      this.__MATHS__.INDEX_ONE - proportionIdle, // To avoid proportionDelta + proportionIdle > 1 with rounding errors.
    )

    // Equivalent to:
    // lastP2PIndex * (
    // p2pGrowthFactor * (1 - proportionDelta - proportionIdle) +
    // poolGrowthFactor * proportionDelta +
    // idleGrowthFactor * proportionIdle)
    // Notice that the idleGrowthFactor is always equal to 1 (no interests accumulated).
    return (
      this.__MATHS__.indexMul(
        lastIndexes.p2pIndex,
        this.__MATHS__.indexMul(
          p2pGrowthFactor,
          this.__MATHS__.INDEX_ONE - proportionDelta - proportionIdle,
        ) +
          this.__MATHS__.indexMul(poolGrowthFactor, proportionDelta) +
          proportionIdle,
      ) / // Careful, p2pIndex scaled in 1e4
      BigInt(1e4)
    )
  }

  private _weightedAverage(x: bigint, y: bigint, percentage: bigint) {
    const z = constants.PERCENT - percentage
    return x * z + y * percentage + constants.HALF_PERCENT / constants.PERCENT
  }
}
