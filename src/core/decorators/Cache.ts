// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CacheEntry = { result: any; timestamp: number }
export function Cache(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalMethod: any,
  _context: ClassMethodDecoratorContext,
) {
  const cache: Record<string, CacheEntry> = {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function replacementMethod(this: any, input: any) {
    const key = JSON.stringify(input)

    const entry = cache[key]

    if (entry) {
      const now = Date.now()

      if (now - entry.timestamp < 30 * 60 * 1000) {
        return entry.result
      }
    }

    const result = await originalMethod.call(this, input)
    cache[key] = { result, timestamp: Date.now() }

    return result
  }

  return replacementMethod
}
