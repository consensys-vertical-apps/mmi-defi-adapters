import { Underlying } from '../../types/adapter'
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
  private readonly BIG_DECIMAL_PRECISION = 32

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
   * Relies on big decimals arithmetic to avoid floating point precision issues.
   *
   * @param {GetApyArgs} args - The arguments containing start/end positions and transactions
   * @returns The interest earned as a decimal (e.g. 0.05 = 5%)
   * @throws {NotSupportedError} If the product doesn't have exactly two underlying tokens
   * @throws {Error} If any of the required balance parameters are zero or undefined
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

    const [balanceStartToken0, priceStartToken0] = this.parse(token0Start)
    const [balanceStartToken1, priceStartToken1] = this.parse(token1Start)
    const [balanceEndToken0, priceEndToken0] = this.parse(token0End)
    const [balanceEndToken1, priceEndToken1] = this.parse(token1End)

    const k = balanceStartToken0.multiply(balanceStartToken1)

    /**
     * Expressing hypothetical balance of TokenB in terms of TokenA:
     * 1. balanceHypotheticalTokenB = balanceHypotheticalTokenA * priceTokenBP1 / priceTokenAP1
     *
     * We also know that hypothetical balances should conserve the k-constant rule so:
     * 2. balanceHypotheticalTokenA * balanceHypotheticalTokenB = k
     *
     * Replacing 1. inside 2. and isolating balanceHypotheticalTokenA gives us:
     */
    const balanceHypotheticalToken1 = new BigDecimal(k.toString(), 64)
      .multiply(priceEndToken0)
      .divide(priceEndToken1)
      .sqrt()

    const balanceHypotheticalToken0 = k.divide(balanceHypotheticalToken1)

    const feesToken0 = balanceEndToken0.subtract(balanceHypotheticalToken0)
    const feesToken1 = balanceEndToken1.subtract(balanceHypotheticalToken1)

    const feesDollarToken0 = feesToken0.multiply(priceEndToken0)
    const feesDollarToken1 = feesToken1.multiply(priceEndToken1)
    const feesDollar = feesDollarToken0.add(feesDollarToken1)

    const initialValueDollar = balanceStartToken0
      .multiply(priceStartToken0)
      .add(balanceStartToken1.multiply(priceStartToken1))

    const interest = feesDollar.divide(initialValueDollar)

    return Number(interest)
  }

  /**
   * Parses a token to return its balance (in token units) and price (in dollars per token unit) as BigDecimals.
   *
   * @param {Underlying} token - The token to parse containing balance and price data
   * @returns {[BigDecimal, BigDecimal]} A tuple containing [balance, price] as BigDecimals
   * @throws {Error} If the token's balance is zero or price is undefined
   * @private
   */
  private parse(token: Underlying): [BigDecimal, BigDecimal] {
    const { symbol, balanceRaw, priceRaw } = token

    if (balanceRaw === 0n)
      throw new Error(
        `Balance of ${symbol} cannot be zero at start of period as it would lead to division by zero.`,
      )

    if (priceRaw === undefined)
      throw new Error(
        `The priceRaw of ${token.symbol} at start and end cannot be undefined.`,
      )

    const balanceBigDecimal = BigDecimal.fromBigInt(
      balanceRaw,
      this.BIG_DECIMAL_PRECISION,
    ).divide(new BigDecimal(10 ** token.decimals))

    const priceBigDecimal = BigDecimal.fromBigInt(
      priceRaw,
      this.BIG_DECIMAL_PRECISION,
    ).divide(new BigDecimal(10 ** 18)) // priceRaw is expressed in dollars per wei, and uses 18 decimals regardless of the token decimals.

    return [balanceBigDecimal, priceBigDecimal]
  }
}
