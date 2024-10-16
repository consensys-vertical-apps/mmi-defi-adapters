import { AVERAGE_BLOCKS_PER_DAY } from '../constants/AVERAGE_BLOCKS_PER_DAY.js'
import { NotSupportedError } from '../errors/errors.js'
import type {
  ApyCalculation,
  ApyCalculator,
  EvmApyArgs,
} from './ApyCalculator.js'
import { computeApr, computeApy } from './common.js'

/**
 * Calculates the APY of a position by calculating the fees as the difference of balance in
 * the underlying token between a given day and the day before.
 *
 * Is compatible with ANY DeFi protocol where the position is tracked by a single amount in wei (for instance the balanceOf an ERC20),
 * and where the balance varies only due to accruing fees/interest ( assuming no deposit or withdrawal).
 *
 * We can translate this mathematically to:
 * balance(t') = balance(t) + fees(t)
 *
 * Compatible protocols / products are:
 * - Stablecoins
 * - Lending (aToken, cToken, ...)
 * - LSTs
 */
export class BalanceOfApyCalculator implements ApyCalculator<EvmApyArgs> {
  public async getApy({
    positionStart,
    positionEnd,
    blocknumberStart,
    blocknumberEnd,
    protocolTokenAddress,
    chainId,
  }: EvmApyArgs): Promise<ApyCalculation> {
    // Duration in days of the period where we look at the fees earned. The APY and APR are then annualized based on this period.
    const durationDays =
      (blocknumberEnd - blocknumberStart) / AVERAGE_BLOCKS_PER_DAY[chainId]

    // How many periods there is in a year
    const frequency = 365 / durationDays

    if (
      positionStart.tokens?.[0]?.tokens?.length !== 1 ||
      positionEnd.tokens?.[0]?.tokens?.length !== 1
    )
      throw new NotSupportedError(
        'BalanceOfApyCalculator only supports APY calculations for products with exactly one underlying token, such as aTokens.',
      )

    const underlyingTokenStart = positionStart.tokens?.[0]?.tokens[0]!
    const underlyingTokenEnd = positionEnd.tokens?.[0]?.tokens[0]!

    const balanceStartWei = underlyingTokenStart.balanceRaw
    const balanceEndWei = underlyingTokenEnd.balanceRaw

    const interest = this.computeInterest(balanceStartWei, balanceEndWei)
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
      protocolTokenAddress,
    }
  }

  protected computeInterest(
    balanceStartWei: bigint,
    balanceEndWei: bigint,
  ): number {
    if (!balanceEndWei && balanceEndWei !== 0n)
      throw new Error('Argument balanceEndWei must be defined')

    if (balanceStartWei === 0n)
      throw new Error(
        'Argument balanceStartWei cannot be equal to zero as it would lead to division by zero',
      )

    if (!balanceStartWei)
      throw new Error('Argument balanceStartWei must be defined')

    const feesWei = balanceEndWei - balanceStartWei

    // Multiply by a large constant (e.g., 1e18) to retain precision
    const precisionFactor = 10n ** 18n

    // Scale up the fees to retain precision
    const interestScaled = (feesWei * precisionFactor) / balanceStartWei

    return Number(interestScaled) / Number(precisionFactor)
  }
}
