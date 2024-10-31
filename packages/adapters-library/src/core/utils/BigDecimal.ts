/**
 * A class that represents a decimal number with a fixed number of decimals.
 * It is used to handle arithmetic operations with a large number of decimal places.
 *
 * Why is it needed? Because arithmetic with BigInts are tricky. For instance:
 *
 * 5n / 10n = 0n
 *
 * Courtesy of https://stackoverflow.com/a/54409977
 */
export class BigDecimal {
  public readonly bigint: bigint
  public readonly decimals: number

  constructor(value: string | number, decimals = 18) {
    let [ints = '0', decis = ''] = String(value).split('.')
    decis = decis.padEnd(decimals, '0')
    this.bigint = BigInt(ints + decis)
    this.decimals = decimals
  }

  /**
   * Creates a BigDecimal instance from a bigint value.
   * This is useful when you already have a bigint representation and want to convert it to a BigDecimal.
   *
   * @param bigint - The bigint value to convert to a BigDecimal
   * @returns A new BigDecimal instance representing the bigint value
   * @example
   * const bd = BigDecimal.fromBigInt(BigInt('123456'))
   * bd.toString() // Returns '123456.000000000000000000'
   */
  public static fromBigInt(bigint: bigint, decimals?: number) {
    return new BigDecimal(bigint.toString(), decimals)
  }

  /**
   * Adds this BigDecimal to another BigDecimal.
   * The addition is performed using the underlying bigint values.
   *
   * @param addend The BigDecimal to add to this one
   * @returns A new BigDecimal representing the sum
   * @example
   * const bd1 = new BigDecimal('10.5')
   * const bd2 = new BigDecimal('2.3')
   * bd1.add(bd2).toString() // Returns '12.800000000000000000'
   */
  public add(addend: BigDecimal): BigDecimal {
    const [scaledThisBigint, scaledAddend, maxDecimals] =
      BigDecimal.scaleValues(this, addend)

    const sum = scaledThisBigint + scaledAddend

    return Object.assign(Object.create(BigDecimal.prototype), {
      bigint: sum,
      decimals: maxDecimals,
    })
  }

  /**
   * Subtracts another BigDecimal from this BigDecimal.
   * The subtraction is performed using the underlying bigint values.
   *
   * @param subtrahend The BigDecimal to subtract from this one
   * @returns A new BigDecimal representing the difference
   * @example
   * const bd1 = new BigDecimal('10.5')
   * const bd2 = new BigDecimal('2.3')
   * bd1.subtract(bd2).toString() // Returns '8.200000000000000000'
   */
  public subtract(subtrahend: BigDecimal): BigDecimal {
    const [scaledThisBigint, scaledSubtrahend, maxDecimals] =
      BigDecimal.scaleValues(this, subtrahend)

    const difference = scaledThisBigint - scaledSubtrahend

    return Object.assign(Object.create(BigDecimal.prototype), {
      bigint: difference,
      decimals: maxDecimals,
    })
  }

  /**
   * Multiplies this BigDecimal by another BigDecimal.
   * The multiplication is performed using the underlying bigint values, with appropriate scaling
   * to maintain decimal precision.
   *
   * @param multiplicand The BigDecimal to multiply by
   * @returns A new BigDecimal representing the product
   * @example
   * const bd1 = new BigDecimal('10.5')
   * const bd2 = new BigDecimal('2')
   * bd1.multiply(bd2).toString() // Returns '21.000000000000000000'
   */
  public multiply(multiplicand: BigDecimal): BigDecimal {
    const [scaledThisBigint, scaledMultiplicand, maxDecimals] =
      BigDecimal.scaleValues(this, multiplicand)

    const product =
      (scaledThisBigint * scaledMultiplicand) /
      BigInt(`1${'0'.repeat(maxDecimals)}`)

    return Object.assign(Object.create(BigDecimal.prototype), {
      bigint: product,
      decimals: maxDecimals,
    })
  }

  /**
   * Divides this BigDecimal by another BigDecimal.
   * The division is performed by first scaling up the dividend by the number of decimals
   * to maintain precision during integer division.
   *
   * @param divisor The BigDecimal to divide by
   * @returns A new BigDecimal representing the quotient
   * @example
   * const bd1 = new BigDecimal('10')
   * const bd2 = new BigDecimal('2')
   * bd1.divide(bd2).toString() // Returns '5.000000000000000000'
   */
  public divide(divisor: BigDecimal): BigDecimal {
    const [scaledThisBigint, scaledDivisor, maxDecimals] =
      BigDecimal.scaleValues(this, divisor)

    const quotient =
      (scaledThisBigint * BigInt(`1${'0'.repeat(maxDecimals)}`)) / scaledDivisor

    return Object.assign(Object.create(BigDecimal.prototype), {
      bigint: quotient,
      decimals: maxDecimals,
    })
  }

  /**
   * Calculates the square root of this BigDecimal.
   * Uses the Newton-Raphson method for approximation.
   *
   * @returns A new BigDecimal representing the square root
   * @throws Error if trying to calculate square root of a negative number
   * @example
   * const bd = new BigDecimal('100')
   * bd.sqrt().toString() // Returns '10.000000000000000000'
   */
  public sqrt(): BigDecimal {
    if (this.bigint < 0n) {
      throw new Error('Cannot calculate square root of negative number')
    }

    if (this.bigint === 0n) {
      return Object.assign(Object.create(BigDecimal.prototype), {
        bigint: 0n,
        decimals: this.decimals,
      })
    }

    // Scale the number up by decimals * 2 to maintain precision during sqrt
    const scaledInput = this.bigint * BigInt(10n ** BigInt(this.decimals))

    // Initial guess - a rough approximation
    let guess = BigInt(
      Math.floor(Math.sqrt(Number(scaledInput) / 10 ** this.decimals)) *
        10 ** (this.decimals / 2),
    )

    // Newton's method iteration
    let iterations = 0
    let lastGuess = 0n
    while (guess !== lastGuess) {
      iterations++
      lastGuess = guess
      guess = (guess + scaledInput / guess) / 2n
    }

    return Object.assign(Object.create(BigDecimal.prototype), {
      bigint: guess,
      decimals: this.decimals,
    })
  }

  /**
   * Converts the BigDecimal to a string representation with the configured number of decimal places.
   *
   * @example
   * const bd = new BigDecimal('123.456')
   * bd.toString() // Returns '123.456000000000000000'
   *
   * const bd2 = new BigDecimal('123.456', 2)
   * bd2.toString() // Returns '123.45'
   *
   * const bd3 = new BigDecimal('-123.456')
   * bd3.toString() // Returns '-123.456000000000000000'
   * @returns
   */
  public toString(): string {
    let s = this.bigint
      .toString()
      .replace('-', '')
      .padStart(this.decimals + 1, '0')
    s = `${s.slice(0, -this.decimals)}.${s.slice(-this.decimals)}`
    return this.bigint < 0 ? `-${s}` : s
  }

  /**
   * Scales two BigDecimals to have the same number of decimal places.
   * Used internally to support arithmetic operations on BigDecimals with different number of decimals.
   *
   * @param value1 First BigDecimal to scale
   * @param value2 Second BigDecimal to scale
   * @returns Array containing the scaled bigint values
   * @private
   */
  private static scaleValues(
    value1: BigDecimal,
    value2: BigDecimal,
  ): [bigint, bigint, number] {
    // Find which BigDecimal has more decimals
    const maxDecimals = Math.max(value1.decimals, value2.decimals)

    // Scale up the one with fewer decimals
    const scaledValue1Bigint =
      value1.decimals < maxDecimals
        ? value1.bigint * BigInt(10 ** (maxDecimals - value1.decimals))
        : value1.bigint

    const scaledValue2Bigint =
      value2.decimals < maxDecimals
        ? value2.bigint * BigInt(10 ** (maxDecimals - value2.decimals))
        : value2.bigint

    return [scaledValue1Bigint, scaledValue2Bigint, maxDecimals]
  }

  /**
   * Checks if this BigDecimal is equal to zero.
   *
   * @returns true if the BigDecimal represents zero, false otherwise
   * @example
   * const bd1 = new BigDecimal('0')
   * bd1.isZero() // Returns true
   *
   * const bd2 = new BigDecimal('1.23')
   * bd2.isZero() // Returns false
   */
  public isZero(): boolean {
    return this.bigint === 0n
  }
}
