export function Profiling(
  originalMethod: (...args: unknown[]) => unknown,
  context: ClassMethodDecoratorContext,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function replacementMethod(this: any, input: unknown[]) {
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
