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
export const computeApr = (interest: number, frequency: number) =>
  frequency * interest

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
export const computeApy = (apr: number, frequency: number) => {
  if (frequency === 0)
    throw new Error(
      'Frequency cannot be 0 as it would result in division by zero.',
    )
  return Math.pow(1 + apr / frequency, frequency) - 1
}