import { Chain } from '../../core/constants/chains'
import {
  DefiMovementsResponse,
  DefiPositionResponse,
} from '../../types/response'

export function getAggregatedValues(
  response: DefiPositionResponse[],
  chainId: Chain,
): string[] {
  const aggregatedValues: string[] = []

  if (chainId === Chain.Linea) {
    return aggregatedValues
  }

  for (const position of response) {
    if (!position.success) {
      continue
    }

    for (const protocolToken of position.tokens) {
      const marketValue = extractMarketValue(protocolToken.tokens!) || 0

      const formattedMarketValue = `USD${marketValue
        .toFixed(2)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`

      aggregatedValues.push(formattedMarketValue)
    }
  }

  return aggregatedValues
}

export function getAggregatedValuesMovements(
  response: DefiMovementsResponse,
  chainId: Chain,
): string[] {
  const aggregatedValues: string[] = []

  if (chainId === Chain.Linea) {
    return aggregatedValues
  }

  if (!response.success) {
    return aggregatedValues
  }

  const movements = response.movements

  for (const displayMovementsByBlock of movements) {
    const marketValue =
      extractMarketValue(displayMovementsByBlock!.tokens!) || 0

    const formattedMarketValue = `USD${marketValue
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`

    aggregatedValues.push(formattedMarketValue)
  }

  return aggregatedValues
}

type Token = {
  balance?: number
  price?: number
  tokens?: Token[]
}
export function extractMarketValue(tokens: Token[]): number {
  if (!tokens) {
    return 0
  }

  let marketValue = 0
  for (const token of tokens) {
    if (token.price !== undefined) {
      // If the token has a price, use it and skip further recursion
      marketValue += token.balance! * token.price
    } else if (token.tokens && token.tokens.length > 0) {
      // Recursively calculate the market value of child tokens
      marketValue += extractMarketValue(token.tokens)
    } else {
      // If no price and no child tokens, default to balance * 0 (or whatever default logic is needed)
      marketValue += token.balance! * (token.price || 0)
    }
  }

  return marketValue
}
