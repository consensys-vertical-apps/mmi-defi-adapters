import { NotSupportedError } from '../errors/errors'
import { BigDecimal } from '../utils/BigDecimal'
import { collectLeafTokens } from '../utils/collectLeafTokens'
import { GetApyArgs } from './ApyCalculator'
import { BaseApyCalculator } from './BaseApyCalculator'

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
export class ConstantProductAmmApyCalculator extends BaseApyCalculator {
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
    const BIG_DECIMAL_PRECISION = 32
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

    const balanceToken0StartWei = BigDecimal.fromBigInt(
      token0Start.balanceRaw,
      BIG_DECIMAL_PRECISION,
    )
    const balanceToken1StartWei = BigDecimal.fromBigInt(
      token1Start.balanceRaw,
      BIG_DECIMAL_PRECISION,
    )
    const balanceToken0EndWei = BigDecimal.fromBigInt(
      token0End.balanceRaw,
      BIG_DECIMAL_PRECISION,
    )
    const balanceToken1EndWei = BigDecimal.fromBigInt(
      token1End.balanceRaw,
      BIG_DECIMAL_PRECISION,
    )


    if (balanceToken0StartWei.isZero())
      throw new Error(
        'Balance of token0 cannot be zero at start of period as it would lead to division by zero.',
      )

    if (balanceToken0EndWei.isZero())
      throw new Error(
        'Balance of token0 cannot be zero at end of period as it would lead to division by zero.',
      )

    if (!balanceToken1StartWei)
      throw new Error(
        'Balance of token1 cannot be undefined at start of period.',
      )

    if (!balanceToken1EndWei)
      throw new Error('Balance of token1 cannot be undefined at end of period.')

    const priceStart = balanceToken1StartWei.divide(balanceToken0StartWei) // Price of token0 in terms of token1
    const priceEnd = balanceToken1EndWei.divide(balanceToken0EndWei) // Price of token0 in terms of token1

    // Calculate initial value in terms of token1
    const initialValue = balanceToken0StartWei
      .multiply(priceStart)
      .add(balanceToken1StartWei)
    console.log('initialValue', initialValue)

    // Calculate what the value would be with original balances at new price in terms of token1
    const adjustedValue = balanceToken0StartWei
      .multiply(priceEnd)
      .add(balanceToken1StartWei)

    // Calculate actual final value in terms of token1
    const finalValue = balanceToken0EndWei
      .multiply(priceEnd)
      .add(balanceToken1EndWei)

    // Fees in token0 and token1 generated through trading, interms of token1
    const feesWei = finalValue.subtract(adjustedValue)

    // Before any division, we multiply by a large constant (e.g., 1e18) to retain precision
    const precisionFactor = 10n ** 18n

    // Scale up the fees to retain precision
    const interestScaled = feesWei
      .multiply(BigDecimal.fromBigInt(precisionFactor, BIG_DECIMAL_PRECISION))
      .divide(initialValue)

    return Number(interestScaled) / Number(precisionFactor)
  }
}
