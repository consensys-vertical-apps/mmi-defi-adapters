import { AVERAGE_BLOCKS_PER_DAY } from '../constants/AVERAGE_BLOCKS_PER_DAY'
import { InvalidArgumentError } from '../errors/errors'
import { ApyCalculator, ApyInfo, GetApyArgs } from './ApyCalculator'
import { VoidApyCalculator } from './VoidApyCalculator'

/**
 * An abstract APY calculator that handles logic that is common to all APY calculators.
 * All APY calculators must extend this class, and implement the `computeInterest` method.
 */
export abstract class BaseApyCalculator implements ApyCalculator {
  /**
   * Handles the common logic for all APY calculations.
   */
  public async getApy(args: GetApyArgs): Promise<ApyInfo | undefined> {
    try {
      const { blocknumberStart, blocknumberEnd, chainId } = args

      // Duration in days of the period where we look at the fees earned. The APY and APR are then annualized based on this period.
      const durationDays =
        (blocknumberEnd - blocknumberStart) / AVERAGE_BLOCKS_PER_DAY[chainId]

      // How many periods there is in a year
      const frequency = 365 / durationDays

      const interest = this.computeInterest(args)

      const interestPercent = interest * 100

      const apr = this.computeApr(interest, frequency)
      const aprPercent = apr * 100

      const apy = this.computeApy(apr, frequency)
      const apyPercent = apy * 100

      return {
        apyPercent,
        apy,
        aprPercent,
        apr,
        period: {
          blocknumberStart,
          blocknumberEnd,
          interestPercent,
          interest,
        },
        compounding: {
          durationDays,
          frequency,
        },
      }
    } catch (error) {
      console.warn(
        'Error encountered while calculating an APY. Defaulting to VoidApyCalculator.',
        error,
      )
      return new VoidApyCalculator().getApy(args)
    }
  }

  /**
   * Implement this method in the extending class.
   */
  protected abstract computeInterest(args: GetApyArgs): number

  /**
   * Computes the Annual Percentage Yield (APY) given the Annual Percentage Rate (APR) and the frequency of compounding periods.
   *
   * APY takes into account the effect of interest compounding over a year, showing the real return on an investment.
   *
   * @param {number} apr - The Annual Percentage Rate (APR) as a decimal (e.g., 0.05 for 5% APR).
   * @param {number} frequency - The number of compounding periods in a year (e.g., 12 for monthly, 365 for daily).
   * @returns {number} The computed APY, which is the annual yield after accounting for compounding.
   *
   * @example
   * // Monthly compounding, 6% APR
   * const apy = computeApy(0.06, 12); // ~ 0.0618 ~ (6.18%)
   */
  public computeApy(apr: number, frequency: number) {
    if (frequency === 0)
      throw new InvalidArgumentError(
        'Frequency cannot be 0 as it would result in division by zero.',
      )
    return Math.pow(1 + apr / frequency, frequency) - 1
  }

  /**
   * Computes the Annual Percentage Rate (APR) given the interest earned and the frequency of compounding periods.
   *
   * APR represents the simple interest rate over a period without considering compounding.
   *
   * @param {number} interest - The interest earned in each compounding period (as a decimal).
   * @param {number} frequency - The number of compounding periods in a year (e.g., 12 for monthly, 365 for daily).
   * @returns {number} The computed APR, which is the annualized simple interest rate.
   *
   * @example
   * // Month period, 0.5% interest per period
   * const apr = computeApr(0.005, 12); // 0.06 = 6%
   */
  public computeApr(interest: number, frequency: number) {
    return frequency * interest
  }
}
