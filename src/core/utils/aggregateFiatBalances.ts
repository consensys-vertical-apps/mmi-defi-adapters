import { priceAdapterConfig } from '../../adapters/prices/products/usd/priceAdapterConfig'
import { Underlying, ProtocolPosition, TokenType } from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'

export function aggregateFiatBalances(
  topLevelTokens: (Underlying | ProtocolPosition)[],
): Record<
  string,
  {
    protocolTokenMetadata: Erc20Metadata & { tokenId?: string }
    usdRaw: bigint
  }
> {
  const result: Record<
    string,
    {
      protocolTokenMetadata: Erc20Metadata & { tokenId?: string }
      usdRaw: bigint
    }
  > = {}

  const processToken = (
    currentToken: Underlying | ProtocolPosition,
    topLevelTokenMetadata: Erc20Metadata & { tokenId?: string },
  ): bigint => {
    if (
      (currentToken.type == TokenType.Underlying ||
        currentToken.type == TokenType.UnderlyingClaimable) &&
      currentToken.priceRaw
    ) {
      const key = topLevelTokenMetadata.tokenId ?? topLevelTokenMetadata.address
      const currentBalance = currentToken.balanceRaw
      const price = currentToken.priceRaw!

      result[key] = {
        protocolTokenMetadata: {
          address: topLevelTokenMetadata.address,
          name: topLevelTokenMetadata.name,
          symbol: topLevelTokenMetadata.symbol,
          decimals: topLevelTokenMetadata.decimals,
          tokenId: topLevelTokenMetadata.tokenId,
        },
        usdRaw:
          (result[key]?.usdRaw || BigInt(0)) +
          (currentBalance * price) / 10n ** BigInt(priceAdapterConfig.decimals),
      }

      return currentBalance
    }

    // Recursively process nested tokens if they exist
    if (currentToken.tokens && currentToken.tokens.length > 0) {
      return currentToken.tokens.reduce(
        (acc, nestedToken) =>
          acc + processToken(nestedToken, topLevelTokenMetadata),
        BigInt(0),
      )
    }

    // Throw an error if a non-Fiat token is found at the base
    throw new Error(
      `Unable to calculate profits, missing USD price for token position ${currentToken.address}`,
    )
  }

  topLevelTokens.forEach((token) => processToken(token, token))
  return result
}
