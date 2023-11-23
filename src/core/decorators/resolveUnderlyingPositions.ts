import { GetPositionsInput, TokenType, Underlying } from '../../types/adapter'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'

export function ResolveUnderlyingPositions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalMethod: any,
  _context: ClassMethodDecoratorContext,
) {
  async function replacementMethod(
    this: IProtocolAdapter,
    input: GetPositionsInput,
  ) {
    const protocolTokens = await originalMethod.call(this, input)

    for (const protocolTokenPosition of protocolTokens) {
      if (!protocolTokenPosition.tokens) {
        continue
      }

      for (const underlyingProtocolTokenPosition of protocolTokenPosition.tokens) {
        const underlyingProtocolTokenAdapter =
          await this.adaptersController.fetchTokenAdapter(
            this.chainId,
            underlyingProtocolTokenPosition.address,
          )

        if (!underlyingProtocolTokenAdapter) {
          continue
        }

        const protocolTokenUnderlyingRate =
          await underlyingProtocolTokenAdapter.getProtocolTokenToUnderlyingTokenRate(
            {
              protocolTokenAddress: underlyingProtocolTokenPosition.address,
              blockNumber: input.blockNumber,
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
    }

    return protocolTokens
  }

  return replacementMethod
}
