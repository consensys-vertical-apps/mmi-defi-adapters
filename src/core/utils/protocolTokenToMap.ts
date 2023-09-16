import { BaseToken, ProtocolToken } from '../../types/adapter.js'
import { Erc20Metadata } from './getTokenMetadata.js'

export function formatProtocolTokenArrayToMap(tokens: ProtocolToken[]) {
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
        underlyingTokenPositions: Record<string, BaseToken>
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
