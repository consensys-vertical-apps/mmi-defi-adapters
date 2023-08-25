import { BaseToken, ProtocolToken } from '../../types/adapter'
import { ERC20 } from './getTokenMetadata'

export function protocolTokenToMap(tokens: ProtocolToken[]) {
  return tokens.reduce(
    (
      acc,
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
          underlyingTokens: underlyingTokens.reduce(
            (acc, underlyingToken) => {
              return {
                [underlyingToken.address]: underlyingToken,
                ...acc,
              }
            },
            {} as Record<string, BaseToken>,
          ),
        },
        ...acc,
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
