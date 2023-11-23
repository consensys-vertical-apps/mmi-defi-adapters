import {
  GetPositionsInput,
  TokenBalance,
  TokenType,
  Underlying,
} from '../../types/adapter'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { SimplePoolAdapter } from '../adapters/SimplePoolAdapter'

export function ResolveUnderlyingPositions(
  originalMethod: SimplePoolAdapter['getPositions'],
  _context: ClassMethodDecoratorContext,
) {
  async function replacementMethod(
    this: IProtocolAdapter,
    input: GetPositionsInput,
  ) {
    const protocolTokens = await originalMethod.call(this, input)

    await recursivePositionSolver({
      adapter: this,
      tokenPositions: protocolTokens,
      blockNumber: input.blockNumber,
    })

    return protocolTokens
  }

  return replacementMethod
}

/**
 * Iterates though a list of token positions, identifies if any of them are a protocol token
 * and resolves them using the correct adapter. Does so recursively until no protocol tokens need resolving.
 */
async function recursivePositionSolver({
  adapter,
  tokenPositions,
  blockNumber,
}: {
  adapter: IProtocolAdapter
  tokenPositions: (TokenBalance & { tokens?: Underlying[] })[]
  blockNumber?: number
}) {
  for (const tokenPosition of tokenPositions) {
    if (!tokenPosition.tokens) {
      continue
    }

    for (const underlyingProtocolTokenPosition of tokenPosition.tokens) {
      const underlyingProtocolTokenAdapter =
        await adapter.adaptersController.fetchTokenAdapter(
          adapter.chainId,
          underlyingProtocolTokenPosition.address,
        )

      if (!underlyingProtocolTokenAdapter) {
        continue
      }

      console.log(
        'XXXX',
        underlyingProtocolTokenPosition,
        underlyingProtocolTokenAdapter,
      )

      const protocolTokenUnderlyingRate =
        await underlyingProtocolTokenAdapter.getProtocolTokenToUnderlyingTokenRate(
          {
            protocolTokenAddress: underlyingProtocolTokenPosition.address,
            blockNumber: blockNumber,
          },
        )

      const computedUnderlyingPositions: Underlying[] =
        protocolTokenUnderlyingRate.tokens?.map((underlyingTokenRate) => {
          return {
            address: underlyingTokenRate.address,
            name: underlyingTokenRate.name,
            symbol: underlyingTokenRate.symbol,
            decimals: underlyingTokenRate.decimals,
            type: TokenType.Underlying,
            balanceRaw:
              (underlyingProtocolTokenPosition.balanceRaw *
                underlyingTokenRate.underlyingRateRaw) /
              10n ** BigInt(underlyingProtocolTokenPosition.decimals),
          }
        }) || []

      underlyingProtocolTokenPosition.tokens = [
        ...(underlyingProtocolTokenPosition.tokens || []),
        ...computedUnderlyingPositions,
      ]
    }

    await recursivePositionSolver({
      adapter,
      tokenPositions: tokenPosition.tokens,
      blockNumber,
    })
  }
}
