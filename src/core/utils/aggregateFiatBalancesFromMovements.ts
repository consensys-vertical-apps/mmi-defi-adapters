import { Underlying, MovementsByBlock } from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { logger } from './logger'

export function aggregateFiatBalancesFromMovements(
  movements: MovementsByBlock[],
): Record<
  string,
  {
    protocolTokenMetadata: Erc20Metadata & { tokenId?: string }
    usdRaw: bigint
    hasTokensWithoutUSDPrices?: boolean
    tokensWithoutUSDPrices?: Underlying[]
  }
> {
  const result: Record<
    string,
    {
      protocolTokenMetadata: Erc20Metadata & { tokenId?: string }
      usdRaw: bigint
      hasTokensWithoutUSDPrices?: boolean
      tokensWithoutUSDPrices?: Underlying[]
    }
  > = {}

  const processToken = (
    currentToken: Underlying,
    protocolToken: Erc20Metadata & { tokenId?: string },
  ): void => {
    const price = currentToken.priceRaw
    const key = protocolToken.tokenId ?? protocolToken.address
    const currentBalance = currentToken.balanceRaw

    result[key] = {
      protocolTokenMetadata: {
        address: protocolToken.address,
        name: protocolToken.name,
        symbol: protocolToken.symbol,
        decimals: protocolToken.decimals,
        tokenId: protocolToken.tokenId,
      },
      usdRaw:
        (result[key]?.usdRaw ?? 0n) +
        (currentBalance * (price ?? 0n)) / 10n ** BigInt(currentToken.decimals),
    }

    // Recursively process nested tokens if they exist
    if (currentToken.tokens && currentToken.tokens.length > 0) {
      currentToken.tokens.forEach((nestedToken) =>
        processToken(nestedToken, protocolToken),
      )
    }

    // Log an error if a non-Fiat token is found at the base
    if (
      !price &&
      price !== 0n &&
      (!currentToken.tokens || currentToken.tokens.length == 0)
    ) {
      logger.warn(
        `Unable to calculate profits, missing USD price for token movement: ${currentToken.address}`,
      )

      result[key]!.hasTokensWithoutUSDPrices = true
      result[key]!.tokensWithoutUSDPrices = result[key]!.tokensWithoutUSDPrices
        ? [...result[key]!.tokensWithoutUSDPrices!, currentToken]
        : [currentToken]
    }
  }

  movements.forEach((movement) => {
    movement.tokens.forEach((token) =>
      processToken(token, movement.protocolToken),
    )
  })

  return result
}
