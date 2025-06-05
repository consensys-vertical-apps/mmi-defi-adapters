const DEFAULT_TIMEOUT_IN_MS = 15_000
export const TIMEOUT_ERROR_MESSAGE = 'Request timed out'

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number = DEFAULT_TIMEOUT_IN_MS,
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(TIMEOUT_ERROR_MESSAGE)), ms),
  )
  return Promise.race([promise, timeout])
}
