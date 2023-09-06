import { BaseToken, ProtocolToken } from '../../types/adapter'
import { ERC20Metadata } from './getTokenMetadata'

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
        protocolTokenMetadata: ERC20Metadata
        underlyingTokenPositions: Record<string, BaseToken>
      }
    >,
  )
}

export function formatTokenArrayToMap<Token extends ERC20Metadata>(tokens: Token[]) {
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
