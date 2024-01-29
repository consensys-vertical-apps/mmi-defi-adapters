import { Underlying, MovementsByBlock } from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'

export function aggregateFiatBalancesFromMovements(
  movements: MovementsByBlock[],
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
    currentToken: Underlying,
    protocolToken: Erc20Metadata & { tokenId?: string },
  ): bigint => {
    const price = currentToken.priceRaw!
    if (price) {
      // Aggregate balance for Fiat type tokens
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
        usdRaw: (result[key]?.usdRaw || BigInt(0)) + currentBalance * price,
      }

      return currentBalance
    }

    // Recursively process nested tokens if they exist
    if (currentToken.tokens && currentToken.tokens.length > 0) {
      return currentToken.tokens.reduce(
        (acc, nestedToken) => acc + processToken(nestedToken, protocolToken),
        BigInt(0),
      )
    }

    // Throw an error if a non-Fiat token is found at the base
    throw new Error(
      `Unable to calculate profits, missing USD price for token movement: ${currentToken.address}`,
    )
  }

  movements.forEach((movement) => {
    movement.tokens.forEach((token) =>
      processToken(token, movement.protocolToken),
    )
  })

  return result
}
