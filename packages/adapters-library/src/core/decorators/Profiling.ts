export function Profiling(
  // biome-ignore lint/suspicious/noExplicitAny: Decorator code
  originalMethod: (input: any) => unknown,
  context: ClassMethodDecoratorContext,
) {
  // biome-ignore lint/suspicious/noExplicitAny: Decorator code
  async function replacementMethod(this: any, input: any) {
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
