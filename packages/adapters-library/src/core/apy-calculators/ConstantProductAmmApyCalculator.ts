import { NotSupportedError } from '../errors/errors'
import { collectLeafTokens } from '../utils/collectLeafTokens'
import { AbstractApyCalculator } from './AbstractApyCalculator'
import { GetApyArgs } from './ApyCalculator'

/**
 * Calculates the APY of a position in a constant product AMM like Uniswap V2.
 * It isolates the fees earned from impermanent loss by calculating adjusted balances:
 *
 * balance(t') = balance(t) + fees(t) + impermanentLoss(t)
 *
 * where:
 *
 * balance(t) + impermanentLoss(t) = adjustedBalance(t')
 *
 * Compatible protocols / products are:
 * - Constant Product AMMs (Uniswap V2, SushiSwap, ...)
 */
export class ConstantProductAmmApyCalculator extends AbstractApyCalculator {
  /**
   * Computes the interest earned by a constant product AMM position over a period.
   * The calculation is done by:
   * 1. Computing the price of token0 in terms of token1 at start and end
   * 2. Computing the total value in token1 terms at start
   * 3. Computing what the start position would be worth at end prices, without any fees
   * 4. Computing the actual end position value
   * 5. The difference between 4 and 3 represents the fees earned
   * 6. Converting to a percentage return by dividing by initial value
   *
   * @param balanceToken0StartWei - The balance of token0 at period start in wei
   * @param balanceToken1StartWei - The balance of token1 at period start in wei
   * @param balanceToken0EndWei - The balance of token0 at period end in wei
   * @param balanceToken1EndWei - The balance of token1 at period end in wei
   * @returns The interest earned as a decimal (e.g. 0.05 = 5%)
   * @throws If any of the required balance parameters are zero or undefined
   */
  public computeInterest(args: GetApyArgs): number {
    const {
      protocolTokenStart,
      protocolTokenEnd,
      withdrawals,
      deposits,
      repays,
      borrows,
    } = args

    const leafTokensStart = collectLeafTokens(protocolTokenStart)
    const leafTokensEnd = collectLeafTokens(protocolTokenEnd)

    if (leafTokensStart.length !== 2 || leafTokensEnd.length !== 2)
      throw new NotSupportedError(
        'ConstantProductAmmApyCalculator only supports APY calculations for products with exactly two underlying tokens, such as Uniswap V2 liquidity pools.',
      )

    const token0Start = leafTokensStart[0]!
    const token1Start = leafTokensStart[1]!
    const token0End = leafTokensEnd[0]!
    const token1End = leafTokensEnd[1]!

    const balanceToken0StartWei = token0Start.balanceRaw
    const balanceToken1StartWei = token1Start.balanceRaw
    const balanceToken0EndWei = token0End.balanceRaw
    const balanceToken1EndWei = token1End.balanceRaw

    if (balanceToken0StartWei === 0n)
      throw new Error(
        'Argument balanceToken0StartWei cannot be equal to zero as it would lead to division by zero',
      )

    if (balanceToken0EndWei === 0n)
      throw new Error(
        'Argument balanceToken0EndWei cannot be equal to zero as it would lead to division by zero',
      )

    if (!balanceToken1StartWei)
      throw new Error('Argument balanceToken1StartWei must be defined')

    if (!balanceToken1EndWei)
      throw new Error('Argument balanceToken1EndWei must be defined')

    const priceStart = balanceToken1StartWei / balanceToken0StartWei // Price of token0 in terms of token1
    const priceEnd = balanceToken1EndWei / balanceToken0EndWei // Price of token0 in terms of token1

    const initialValue =
      balanceToken0StartWei * priceStart + balanceToken1StartWei // In terms of TokenB
    const adjustedValue =
      balanceToken0StartWei * priceEnd + balanceToken1StartWei // In terms of TokenB
    const finalValue = balanceToken0EndWei * priceEnd + balanceToken1EndWei // In terms of TokenB

    const feesWei = finalValue - adjustedValue // In terms of TokenB

    // Multiply by a large constant (e.g., 1e18) to retain precision
    const precisionFactor = 10n ** 18n

    // Scale up the fees to retain precision
    const interestScaled = (feesWei * precisionFactor) / initialValue

    return Number(interestScaled) / Number(precisionFactor)
  }
}
