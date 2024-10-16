import type {
  AggregatedFiatBalances,
  ProtocolPosition,
  Underlying,
} from '../../types/adapter.js'
import type { Erc20Metadata } from '../../types/erc20Metadata.js'
import { logger } from './logger.js'

export function aggregateFiatBalances(
  topLevelTokens: (Underlying | ProtocolPosition)[],
): AggregatedFiatBalances {
  const result: AggregatedFiatBalances = {}

  const processToken = (
    currentToken: Underlying | ProtocolPosition,
    topLevelTokenMetadata: Erc20Metadata & { tokenId?: string },
  ): void => {
    let price: bigint | undefined

    const key = topLevelTokenMetadata.tokenId ?? topLevelTokenMetadata.address
    const currentBalance = currentToken.balanceRaw

    result[key] = {
      protocolTokenMetadata: {
        address: topLevelTokenMetadata.address,
        name: topLevelTokenMetadata.name,
        symbol: topLevelTokenMetadata.symbol,
        decimals: topLevelTokenMetadata.decimals,
        tokenId: topLevelTokenMetadata.tokenId,
      },
      usdRaw: result[key]?.usdRaw ?? 0n,
    }

    if ('priceRaw' in currentToken) {
      price = currentToken.priceRaw ?? 0n

      result[key]!.usdRaw =
        (result[key]?.usdRaw ?? 0n) +
        (currentBalance * price!) / 10n ** BigInt(currentToken.decimals)
    }

    // Recursively process nested tokens if they exist
    if (currentToken.tokens && currentToken.tokens.length > 0) {
      currentToken.tokens.forEach((nestedToken) =>
        processToken(nestedToken, topLevelTokenMetadata),
      )
    }

    // Log an error if a non-Fiat token is found at the base
    if (
      !price &&
      price !== 0n &&
      (!currentToken.tokens || currentToken.tokens.length === 0)
    ) {
      logger.warn(
        `Unable to calculate profits, missing USD price for token position ${currentToken.address}`,
      )

      result[key]!.hasTokensWithoutUSDPrices = true
      result[key]!.tokensWithoutUSDPrices = result[key]!.tokensWithoutUSDPrices
        ? [...result[key]!.tokensWithoutUSDPrices!, currentToken as Underlying]
        : [currentToken as Underlying]
    }
  }

  topLevelTokens.forEach((token) => processToken(token, token))
  return result
}
