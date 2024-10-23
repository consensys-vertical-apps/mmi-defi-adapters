import { Underlying } from '@metamask-institutional/defi-sdk'
import { DisplayPosition } from '../../types/response'

export function propagatePrice(token: DisplayPosition<Underlying>): number {
  if (!token.tokens || token.tokens.length === 0) {
    // Leaf node: Calculate value as balance * price
    if (!token.price) {
      throw new Error(`Price not defined for token at address ${token.address}`)
    }

    const value = token.balance * token.price
    console.log(
      `Token: ${token.address}, Balance: ${token.balance}, Price: ${token.price}, Value: ${value}`,
    )
    return value
  }

  // Aggregate the value of the child tokens
  let totalValue = 0
  for (const childToken of token.tokens) {
    const childValue = propagatePrice(childToken) // Recursive call for child tokens
    totalValue += childValue
    console.log(
      `Token: ${token.address}, Child Token: ${childToken.address}, Child Value: ${childValue}`,
    )
  }

  // Handle zero balance case: Assume a balance of 1 to prevent division by zero
  const adjustedBalance = token.balance === 0 ? 1 : token.balance

  // Update the price field for the parent based on aggregated value of children
  token.price = totalValue / adjustedBalance
  console.log(
    `Token: ${token.address}, Aggregated Value: ${totalValue}, Updated Price: ${token.price}`,
  )

  return totalValue // Return the total value for propagation up the chain
}
