import { ProtocolPosition, Underlying } from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'

export function formatProtocolTokenArrayToMap(
  tokens: ProtocolPosition[],
  useTokenIdAsIndex = false,
) {
  return tokens.reduce(
    (
      accumulator,
      {
        address,
        name,
        symbol,
        decimals,
        tokens: underlyingTokens = [],
        tokenId,
      },
    ) => {
      const assetIdentifier = useTokenIdAsIndex ? tokenId! : address

      return {
        [assetIdentifier]: {
          protocolTokenMetadata: {
            address,
            name,
            symbol,
            decimals,
            tokenId,
          },
          underlyingTokenPositions: formatTokenArrayToMap(underlyingTokens),
        },
        ...accumulator,
      }
    },
    {} as Record<
      string,
      {
        protocolTokenMetadata: Erc20Metadata & { tokenId?: string }
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
