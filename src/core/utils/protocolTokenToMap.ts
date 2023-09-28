import { Underlying, ProtocolPosition } from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'

export function formatProtocolTokenArrayToMap(tokens: ProtocolPosition[]) {
  return tokens.reduce(
    (
      accumulator,
      { address, name, symbol, decimals, tokens: underlyingTokens = [] },
    ) => {
      return {
        [address]: {
          protocolTokenMetadata: {
            address,
            name,
            symbol,
            decimals,
          },
          underlyingTokenPositions: formatTokenArrayToMap(underlyingTokens),
        },
        ...accumulator,
      }
    },
    {} as Record<
      string,
      {
        protocolTokenMetadata: Erc20Metadata
        underlyingTokenPositions: Record<string, Underlying>
      }
    >,
  )
}

export function formatTokenArrayToMap<Token extends Erc20Metadata>(
  tokens: Token[],
) {
  return tokens.reduce(
    (accumulator, currentToken) => {
      return {
        [currentToken.address]: currentToken,
        ...accumulator,
      }
    },
    {} as Record<string, Token>,
  )
}
