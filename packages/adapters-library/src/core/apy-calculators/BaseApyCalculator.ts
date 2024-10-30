import { AVERAGE_BLOCKS_PER_DAY } from '../constants/AVERAGE_BLOCKS_PER_DAY'
import { ApyCalculator, ApyInfo, GetApyArgs } from './ApyCalculator'
import { VoidApyCalculator } from './VoidApyCalculator'
import { computeApr, computeApy } from './helpers'

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

      const apr = computeApr(interest, frequency)
      const aprPercent = apr * 100

      const apy = computeApy(apr, frequency)
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
}
