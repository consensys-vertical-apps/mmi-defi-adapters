import * as constants from 'evm-maths/lib/constants.js'
import * as PercentMath from 'evm-maths/lib/percent.js'
import * as WadMath from 'evm-maths/lib/wad.js'
import type { MarketData } from './Blue.js'

export class MorphoBlueMath {
  pow10 = (exponant: bigint | number) => 10n ** BigInt(exponant)

  WAD = this.pow10(18)

  wMulDown = (x: bigint, y: bigint): bigint => this.mulDivDown(x, y, this.WAD)
  wDivDown = (x: bigint, y: bigint): bigint => this.mulDivDown(x, this.WAD, y)
  wDivUp = (x: bigint, y: bigint): bigint => this.mulDivUp(x, this.WAD, y)
  mulDivDown = (x: bigint, y: bigint, d: bigint): bigint => (x * y) / d
  mulDivUp = (x: bigint, y: bigint, d: bigint): bigint => (x * y + (d - 1n)) / d
  min = (a: bigint, b: bigint) => (a < b ? a : b)
  max = (a: bigint, b: bigint) => (a < b ? b : a)

  wTaylorCompounded = (x: bigint, n: bigint): bigint => {
    const firstTerm = x * n
    const secondTerm = this.mulDivDown(firstTerm, firstTerm, 2n * this.WAD)
    const thirdTerm = this.mulDivDown(secondTerm, firstTerm, 3n * this.WAD)
    return firstTerm + secondTerm + thirdTerm
  }

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

  /// @dev The number of virtual shares has been chosen low enough to prevent overflows, and high enough to ensure
  /// high precision computations.
  VIRTUAL_SHARES = 10n ** 6n

  /// @dev A number of virtual assets of 1 enforces a conversion rate between shares and assets when a market is
  /// empty.
  VIRTUAL_ASSETS = 1n

  /// @dev Calculates the value of `assets` quoted in shares, rounding down.
  toSharesDown = (
    assets: bigint,
    totalAssets: bigint,
    totalShares: bigint,
  ): bigint => {
    return this.mulDivDown(
      assets,
      totalShares + this.VIRTUAL_SHARES,
      totalAssets + this.VIRTUAL_ASSETS,
    )
  }

  /// @dev Calculates the value of `shares` quoted in assets, rounding down.
  toAssetsDown = (
    shares: bigint,
    totalAssets: bigint,
    totalShares: bigint,
  ): bigint => {
    return this.mulDivDown(
      shares,
      totalAssets + this.VIRTUAL_ASSETS,
      totalShares + this.VIRTUAL_SHARES,
    )
  }

  /// @dev Calculates the value of `assets` quoted in shares, rounding up.
  toSharesUp = (
    assets: bigint,
    totalAssets: bigint,
    totalShares: bigint,
  ): bigint => {
    return this.mulDivUp(
      assets,
      totalShares + this.VIRTUAL_SHARES,
      totalAssets + this.VIRTUAL_ASSETS,
    )
  }

  /// @dev Calculates the value of `shares` quoted in assets, rounding up.
  toAssetsUp = (
    shares: bigint,
    totalAssets: bigint,
    totalShares: bigint,
  ): bigint => {
    return this.mulDivUp(
      shares,
      totalAssets + this.VIRTUAL_ASSETS,
      totalShares + this.VIRTUAL_SHARES,
    )
  }

  accrueInterests = (
    lastBlockTimestamp: bigint,
    marketState: MarketData,
    borrowRate: bigint,
  ) => {
    const elapsed = lastBlockTimestamp - marketState.lastUpdate
    if (elapsed === 0n) return marketState
    if (marketState.totalBorrowAssets !== 0n) {
      const interest = this.wMulDown(
        marketState.totalBorrowAssets,
        this.wTaylorCompounded(borrowRate, elapsed),
      )
      const marketWithNewTotal = {
        ...marketState,
        totalBorrowAssets: marketState.totalBorrowAssets + interest,
        totalSupplyAssets: marketState.totalSupplyAssets + interest,
      }

      if (marketWithNewTotal.fee !== 0n) {
        const feeAmount = this.wMulDown(interest, marketWithNewTotal.fee)
        // The fee amount is subtracted from the total supply in this calculation to compensate for the fact
        // that total supply is already increased by the full interest (including the fee amount).
        const feeShares = this.toSharesDown(
          feeAmount,
          marketWithNewTotal.totalSupplyAssets - feeAmount,
          marketWithNewTotal.totalSupplyShares,
        )
        return {
          ...marketWithNewTotal,
          totalSupplyShares: marketWithNewTotal.totalSupplyShares + feeShares,
        }
      }
      return marketWithNewTotal
    }
    return marketState
  }
}
