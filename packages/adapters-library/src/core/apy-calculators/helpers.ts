import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { ApyCalculator } from './ApyCalculator'
import { BalanceOfApyCalculator } from './BalanceOfApyCalculator'
import { ConstantProductAmmApyCalculator } from './ConstantProductAmmApyCalculator'
import { VoidApyCalculator } from './VoidApyCalculator'

/**
 * Creates an appropriate APY calculator for a given protocol adapter.
 *
 * @param {IProtocolAdapter} adapter - The protocol adapter for which to create an APY calculator.
 * @returns {ApyCalculator} - An instance of `ApyCalculator`
 */
export const createApyCalculatorFor = async (
  adapter: IProtocolAdapter,
  protocolTokenAddress: string,
): Promise<ApyCalculator> => {
  try {
    const protocolTokens = await adapter.getProtocolTokens()

    const protocolToken = protocolTokens.find(
      (item) => item.address === protocolTokenAddress,
    )
    if (!protocolToken)
      throw new Error(
        `Adapter ${adapter.productId}/${adapter.productId} has no protocol token with address ${protocolTokenAddress}`,
      )

    if (protocolToken.underlyingTokens.length === 1)
      return new BalanceOfApyCalculator()

    if (protocolToken.underlyingTokens.length === 2)
      return new ConstantProductAmmApyCalculator()

    return new VoidApyCalculator()
  } catch (error) {
    console.warn(
      'Error encountered while creating an APY calculator. Defaulting to VoidApyCalculator.',
      error,
    )
    return new VoidApyCalculator()
  }
}
