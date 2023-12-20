const THIRTY_MINUTES = 30 * 60 * 1000

type CacheEntry<T> = { result: T; timestamp: number }

export function Cache<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalMethod: (input: any) => Promise<T>,
  _context: ClassMethodDecoratorContext,
) {
  const cache: Record<string, Promise<CacheEntry<T>>> = {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function replacementMethod(this: unknown, input: any) {
    const key = JSON.stringify(input)

    const cachedEntryPromise = cache[key]

    if (cachedEntryPromise) {
      const now = Date.now()

      const entry = await cachedEntryPromise

      if (now - entry.timestamp < THIRTY_MINUTES) {
        return entry.result
      }
    }

    const entryPromise = new Promise<CacheEntry<T>>((resolve) => {
      originalMethod.call(this, input).then((result) => {
        resolve({ result, timestamp: Date.now() })
      })
    })

    cache[key] = entryPromise

    return (await entryPromise).result
  }

  return replacementMethod
}
