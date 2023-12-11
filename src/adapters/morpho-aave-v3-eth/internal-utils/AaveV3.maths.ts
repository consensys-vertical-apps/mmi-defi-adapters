import { formatUnits, parseUnits } from 'ethers'
import * as constants from 'evm-maths/lib/constants'
import * as PercentMath from 'evm-maths/lib/percent'
import * as RayMath from 'evm-maths/lib/ray'
import * as WadMath from 'evm-maths/lib/wad'

export const SECONDS_PER_YEAR = 3600 * 24 * 365

export class MorphoAaveMath {
  /** Indexes are expressed in RAY */
  private _indexesDecimals = 27
  indexMul = RayMath.rayMul
  // rayMulUp
  indexMulUp = (a: bigint, b: bigint) => {
    if (a === BigInt(0) || b === BigInt(0)) return BigInt(0)

    return a * b + (constants.RAY - 1n) / constants.RAY
  }

  indexDiv = RayMath.rayDiv
  INDEX_ONE = constants.RAY
  indexDivUp = (a: bigint, b: bigint) =>
    RayMath.rayDiv(constants.HALF_RAY + a, b)

  mul = WadMath.wadMul
  div = WadMath.wadDiv
  ONE = constants.WAD
  mulDown = (a: bigint, b: bigint) => (a * b) / constants.WAD
  divDown = (a: bigint, b: bigint) => (constants.WAD * a) / b

  percentMul = PercentMath.percentMul
  percentMulDown = (x: bigint, percentage: bigint) => {
    return (x * percentage) / constants.PERCENT
  }
  percentDiv = PercentMath.percentDiv
  PERCENT_ONE = constants.PERCENT

  // https://github.com/morpho-org/morpho-aave-v3/blob/main/src/MorphoInternal.sol#LL312C20-L312C20
  divUp = (a: bigint, b: bigint) => a / b + (a % b > 0 ? 1n : 0n)
  /**
   * Computes the mid rate depending on the p2p index cursor
   *
   * @param supplyRate in RAY _(27 decimals)_
   * @param borrowRate in RAY _(27 decimals)_
   * @param p2pIndexCursor in BASE_UNITS _(4 decimals)_
   * @returns the raw p2p rate
   */
  private _computeMidRate(
    supplyRate: bigint,
    borrowRate: bigint,
    p2pIndexCursor: bigint,
  ) {
    if (borrowRate <= supplyRate) return borrowRate
    return (
      this.PERCENT_ONE -
      p2pIndexCursor * supplyRate +
      (borrowRate * p2pIndexCursor) / this.PERCENT_ONE
    )
  }

  /**
   * Computes P2P Rates considering deltas, idle liquidity and fees
   *
   * @param poolSupplyRate in RAY _(27 decimals)_
   * @param poolBorrowRate in RAY _(27 decimals)_
   * @param p2pIndexCursor in BASE_UNITS _(4 decimals)_
   * @param reserveFactor in  BASE_UNITS _(4 decimals)_
   * @param supplyProportionDelta in RAY _(27 decimals)_
   * @param borrowProportionDelta in RAY _(27 decimals)_
   * @param proportionIdle in RAY _(27 decimals)_
   * @returns the computed P2P rates in RAY _(27 decimals)_
   */
  private _computeP2PRates(
    poolSupplyRate: bigint,
    poolBorrowRate: bigint,
    p2pIndexCursor: bigint,
    reserveFactor: bigint = 0n,
    supplyProportionDelta: bigint = 0n,
    borrowProportionDelta: bigint = 0n,
    proportionIdle: bigint = 0n,
  ) {
    const midRate = this._computeMidRate(
      poolSupplyRate,
      poolBorrowRate,
      p2pIndexCursor,
    )
    const supplyRatesWithFees =
      midRate - this.percentMul(midRate - poolSupplyRate, reserveFactor)
    const borrowRatesWithFees =
      midRate + this.percentMul(poolBorrowRate - midRate, reserveFactor)

    return {
      p2pSupplyRate:
        this.indexMul(
          this.INDEX_ONE - supplyProportionDelta - proportionIdle,
          supplyRatesWithFees,
        ) + this.indexMul(supplyProportionDelta, poolSupplyRate),
      p2pBorrowRate:
        this.indexMul(
          this.INDEX_ONE - borrowProportionDelta,
          borrowRatesWithFees,
        ) + this.indexMul(borrowProportionDelta, poolBorrowRate),
    }
  }

  /**
   * Transforms a **Yearly** rate into an APY
   * @param yearlyRate in RAY _(27 decimals)_
   * @returns the compounded APY in BASE_UNITS _(4 decimals)_
   */
  private _rateToAPY(yearlyRate: bigint) {
    const ratePerSeconds = yearlyRate / BigInt(SECONDS_PER_YEAR)
    return this.compoundInterests(ratePerSeconds, SECONDS_PER_YEAR)
  }

  /**
   * Compound interests over a specific duration
   * @param rate rate over one period in RAY _(27 decimals)_
   * @param duration number of periods
   */
  public compoundInterests(rate: bigint, duration: number) {
    return parseUnits(
      (
        Math.pow(1 + +formatUnits(rate, this._indexesDecimals), duration) - 1
      ).toFixed(4),
      4,
    )
  }

  /**
   * Computes APYs from rates
   *
   * @param poolSupplyRate in RAY _(27 decimals)_
   * @param poolBorrowRate in RAY _(27 decimals)_
   * @param p2pIndexCursor in BASE_UNITS _(4 decimals)_
   * @param supplyProportionDelta in RAY _(27 decimals)_
   * @param borrowProportionDelta in RAY _(27 decimals)_
   * @param proportionIdle in RAY _(27 decimals)_
   * @param reserveFactor in BASE_UNITS _(4 decimals)_
   * @returns the computed APYs in BASE_UNITS _(4 decimals)_
   */
  computeApysFromRates(
    poolSupplyRate: bigint,
    poolBorrowRate: bigint,
    p2pIndexCursor: bigint,
    supplyProportionDelta: bigint = 0n,
    borrowProportionDelta: bigint = 0n,
    proportionIdle: bigint = 0n,
    reserveFactor: bigint = 0n,
  ) {
    const { p2pBorrowRate, p2pSupplyRate } = this._computeP2PRates(
      poolSupplyRate,
      poolBorrowRate,
      p2pIndexCursor,
      reserveFactor,
      supplyProportionDelta,
      borrowProportionDelta,
      proportionIdle,
    )

    return {
      poolBorrowAPY: this._rateToAPY(poolBorrowRate),
      poolSupplyAPY: this._rateToAPY(poolSupplyRate),
      p2pSupplyAPY: this._rateToAPY(p2pSupplyRate),
      p2pBorrowAPY: this._rateToAPY(p2pBorrowRate),
    }
  }
}
