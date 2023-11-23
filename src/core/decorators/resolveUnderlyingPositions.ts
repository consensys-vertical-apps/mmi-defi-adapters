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

      for (const underlyingTokenPosition of protocolTokenPosition.tokens) {
        const underlyingTokenAdapter =
          await this.adaptersController.fetchTokenAdapter(
            this.chainId,
            underlyingTokenPosition.address,
          )

        if (!underlyingTokenAdapter) {
          continue
        }

        const protocolTokenUnderlyingRate =
          await underlyingTokenAdapter.getProtocolTokenToUnderlyingTokenRate({
            protocolTokenAddress: underlyingTokenPosition.address,
            blockNumber: input.blockNumber,
          })

        console.log('INSIDE NEW ADAPTER', {
          currentProtocolId: this.protocolId,
          currentProductId: this.productId,
          protocolId: underlyingTokenAdapter.protocolId,
          productId: underlyingTokenAdapter.productId,
          protocolTokenUnderlyingRate,
          xxx: protocolTokenUnderlyingRate.tokens![0],
        })

        const computedUnderlyingPositions: Underlying[] =
          protocolTokenUnderlyingRate.tokens?.map((underlyingTokenRate) => {
            return {
              address: underlyingTokenRate.address,
              name: underlyingTokenRate.name,
              symbol: underlyingTokenRate.symbol,
              decimals: underlyingTokenRate.decimals,
              type: TokenType.Underlying,
              balanceRaw:
                (underlyingTokenPosition.balanceRaw *
                  underlyingTokenRate.underlyingRateRaw) /
                10n ** BigInt(underlyingTokenRate.decimals),
            }
          }) || []

        underlyingTokenPosition.tokens = [
          ...(underlyingTokenPosition.tokens || []),
          ...computedUnderlyingPositions,
        ]
      }
    }

    return protocolTokens
  }

  return replacementMethod
}
