const TimeoutErrorMessage = 'Operation timed out'

export function retryHandlerFactory({
  rpcCallTimeoutInMs,
  rpcCallRetries,
}: {
  rpcCallTimeoutInMs: number
  rpcCallRetries: number
}) {
  return async function retryHandler<T>(
    call: () => Promise<T>,
    retryCount: number = 0,
  ): Promise<T> {
    try {
      return await new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error(TimeoutErrorMessage)),
          rpcCallTimeoutInMs,
        )

        call()
          .then(resolve)
          .catch(reject)
          .finally(() => clearTimeout(timeout))
      })
    } catch (error) {
      if (
        (error instanceof Error && error.message !== TimeoutErrorMessage) ||
        retryCount >= rpcCallRetries
      ) {
        throw error
      }

      return retryHandler(call, retryCount + 1)
    }
  }
}
