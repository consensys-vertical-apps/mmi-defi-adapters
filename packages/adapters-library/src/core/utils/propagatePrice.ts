import { Underlying } from '../../types/adapter'
import { DisplayPosition } from '../../types/response'

export function propagatePrice(
  token: DisplayPosition<Underlying>,
): number | undefined {
  if (!token.tokens || token.tokens.length === 0) {
    // Leaf node: If no price is defined, propagate undefined upwards
    if (token.price === undefined) {
      console.log(`Price is undefined for token at address ${token.address}`)
      return undefined // No value to propagate
    }

    const value = token.balance * token.price
    console.log(
      `Token: ${token.address}, Balance: ${token.balance}, Price: ${token.price}, Value: ${value}`,
    )
    return value
  }

  // Aggregate the value of the child tokens
  let totalValue: number | undefined = 0
  let allChildrenHavePrice = true // Track if ALL child tokens have a defined price

  for (const childToken of token.tokens) {
    const childValue = propagatePrice(childToken) // Recursive call for child tokens

    if (childValue === undefined) {
      allChildrenHavePrice = false // If any child is missing a price, mark false
    } else {
      totalValue = (totalValue ?? 0) + childValue // Only add defined child values
    }

    console.log(
      `Token: ${token.address}, Child Token: ${childToken.address}, Child Value: ${childValue}`,
    )
  }

  // Handle zero balance case: Assume a balance of 1 to prevent division by zero
  const adjustedBalance = token.balance === 0 ? 1 : token.balance

  // If ALL child tokens have a defined price, update the parent token's price
  if (allChildrenHavePrice && totalValue !== undefined) {
    token.price = totalValue / adjustedBalance
    console.log(
      `Token: ${token.address}, Aggregated Value: ${totalValue}, Updated Price: ${token.price}`,
    )
  } else {
    //@ts-ignore
    token.price = undefined
    console.log(
      `Token: ${token.address} could not update price, one or more child tokens have undefined prices.`,
    )
  }

  return allChildrenHavePrice ? totalValue : undefined // Return total value if all children have a price
}
