import { Underlying } from '../../types/adapter'
import { DisplayPosition } from '../../types/response'
import { Chain } from '../constants/chains'
import { logger } from './logger'

export function propagatePrice(
  token: DisplayPosition<Underlying>,
  chainId: Chain,
): number | undefined {
  if (!token.tokens || token.tokens.length === 0) {
    // Leaf node: If no price is defined, propagate undefined upwards
    if (token.price === undefined) {
      logger.warn(
        { tokenAddress: token.address, chainId },
        'Price is undefined for token',
      )
      return undefined // No value to propagate
    }

    const value = token.balance * token.price

    return value
  }

  // Aggregate the value of the child tokens
  let totalValue: number | undefined = 0
  let allChildrenHavePrice = true // Track if ALL child tokens have a defined price

  for (const childToken of token.tokens) {
    const childValue = propagatePrice(childToken, chainId) // Recursive call for child tokens

    if (childValue === undefined) {
      allChildrenHavePrice = false // If any child is missing a price, mark false
    } else {
      totalValue = (totalValue ?? 0) + childValue // Only add defined child values
    }
  }

  // Handle zero balance case: Assume a balance of 1 to prevent division by zero
  const adjustedBalance = token.balance === 0 ? 1 : token.balance

  // If ALL child tokens have a defined price, update the parent token's price
  if (allChildrenHavePrice && totalValue !== undefined) {
    token.price = totalValue / adjustedBalance
  } else {
    // If ANY child token is missing a price, set the parent token's price to undefined
    //@ts-ignore
    token.price = undefined
  }

  return allChildrenHavePrice ? totalValue : undefined // Return total value if all children have a price
}
