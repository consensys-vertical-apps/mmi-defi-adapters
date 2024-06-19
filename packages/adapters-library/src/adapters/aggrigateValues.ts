import { PositionType } from '../types/adapter'
import { DefiPositionResponse } from '../types/response'

export function getAggregatedValues(
  response: DefiPositionResponse[],
): string[] {
  const aggregatedValues: string[] = []

  for (const position of response) {
    console.log('oioi')
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

type Token = {
  balance: number
  price?: number
  tokens?: Token[]
}
function extractMarketValue(tokens: Token[]): number {
  if (!tokens) {
    return 0
  }

  let marketValue = 0
  for (const token of tokens) {
    marketValue +=
      token.tokens && token.tokens.length > 0
        ? extractMarketValue(token.tokens)
        : token.balance * (token.price || 0)
  }

  return marketValue
}
