import { sumBy } from 'lodash'
import util from 'node:util'
import { sumBy } from 'lodash'
import { MovementsByBlock, Underlying } from '../../types/adapter'
import { AVERAGE_BLOCKS_PER_DAY } from '../constants/AVERAGE_BLOCKS_PER_DAY'
import { NotSupportedError } from '../errors/errors'
import { collectLeafTokens } from '../utils/collectLeafTokens'
import { ApyCalculator, ApyInfo, GetApyArgs } from './ApyCalculator'
import { VoidApyCalculator } from './VoidApyCalculator'
import { computeApr, computeApy } from './helpers'

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
export class BalanceOfApyCalculator implements ApyCalculator {
  public async getApy(args: GetApyArgs): Promise<ApyInfo | undefined> {
    try {
      const {
        protocolTokenStart,
        protocolTokenEnd,
        blocknumberStart,
        blocknumberEnd,
        chainId,
        withdrawals,
        deposits,
        repays,
        borrows,
      } = args

      // Duration in days of the period where we look at the fees earned. The APY and APR are then annualized based on this period.
      const durationDays =
        (blocknumberEnd - blocknumberStart) / AVERAGE_BLOCKS_PER_DAY[chainId]

      // How many periods there is in a year
      const frequency = 365 / durationDays

      const leafTokensStart = collectLeafTokens(protocolTokenStart)
      const leafTokensEnd = collectLeafTokens(protocolTokenEnd)

      if (leafTokensStart.length !== 1 || leafTokensEnd.length !== 1)
        throw new NotSupportedError(
          'BalanceOfApyCalculator only supports APY calculations for products with exactly one underlying token, such as aTokens.',
        )

      const underlyingTokenStart = leafTokensStart[0]!
      const underlyingTokenEnd = leafTokensEnd[0]!

      const balanceStartWei = underlyingTokenStart.balanceRaw
      const balanceEndWei = underlyingTokenEnd.balanceRaw

      type Item = MovementsByBlock | Underlying
      const leafWithdraws = withdrawals.flatMap(collectLeafTokens<Item>)
      const leafDeposits = deposits.flatMap(collectLeafTokens<Item>)
      const leafRepays = repays.flatMap(collectLeafTokens<Item>)
      const leafBorrows = borrows.flatMap(collectLeafTokens<Item>)

      const balanceWithdrawsWei = BigInt(sumBy(leafWithdraws, 'balanceRaw'))
      const balanceDepositsWei = BigInt(sumBy(leafDeposits, 'balanceRaw'))
      const balanceRepaysWei = BigInt(sumBy(leafRepays, 'balanceRaw'))
      const balanceBorrowsWei = BigInt(sumBy(leafBorrows, 'balanceRaw'))

      const interest = this.computeInterest(
        balanceStartWei,
        balanceEndWei +
          balanceWithdrawsWei +
          balanceRepaysWei -
          balanceDepositsWei -
          balanceBorrowsWei,
      )
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
