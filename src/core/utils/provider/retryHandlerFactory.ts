const TimeoutErrorMessage = 'Operation timed out'

export function retryHandlerFactory({
  timeoutInMs,
  maxRetries,
}: {
  timeoutInMs: number
  maxRetries: number
}) {
  return async function retryHandler<T>(
    call: () => Promise<T>,
    retryCount: number = 0,
  ): Promise<T> {
    try {
      return await new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error(TimeoutErrorMessage)),
          timeoutInMs,
        )

        call()
          .then(resolve)
          .catch(reject)
          .finally(() => clearTimeout(timeout))
      })
    } catch (error) {
      if (
        (error instanceof Error && error.message !== TimeoutErrorMessage) ||
        retryCount >= maxRetries
      ) {
        throw error
      }

      return retryHandler(call, retryCount + 1)
    }
  }
}
