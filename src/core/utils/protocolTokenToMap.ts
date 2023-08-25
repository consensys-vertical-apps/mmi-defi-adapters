import { BaseToken, ProtocolToken } from '../../types/adapter'
import { ERC20 } from './getTokenMetadata'

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
          underlyingTokens: formatTokenArrayToMap(underlyingTokens),
        },
        ...accumulator,
      }
    },
    {} as Record<
      string,
      {
        protocolTokenMetadata: ERC20
        underlyingTokens: Record<string, BaseToken>
      }
    >,
  )
}

export function formatTokenArrayToMap<T extends ERC20>(tokens: T[]) {
  return tokens.reduce(
    (accumulator, currentToken) => {
      return {
        [currentToken.address]: currentToken,
        ...accumulator,
      }
    },
    {} as Record<string, T>,
  )
}
