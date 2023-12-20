import { IProtocolAdapter } from '../../types/IProtocolAdapter'

// eslint-disable-next-line @typescript-eslint/no-explicit-any

export function Profiling(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalMethod: any,
  context: ClassMethodDecoratorContext,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function replacementMethod(this: IProtocolAdapter, input: any) {
    const key = JSON.stringify({
      methodName: context.name,
      chainId: this.chainId,
      productId: this.productId,
      protocolId: this.protocolId,
      ...input,
    })

    console.time(key)

    const result = await originalMethod.call(this, input)
    console.timeEnd(key)

    return result
  }

  return replacementMethod
}
