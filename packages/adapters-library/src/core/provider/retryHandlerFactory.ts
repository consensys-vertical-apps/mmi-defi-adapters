import { logger } from '../utils/logger.js'

const TimeoutErrorMessage = 'Operation timed out'

export function retryHandlerFactory({
  timeoutInMs,
  maxRetries,
}: {
  timeoutInMs: number
  maxRetries: number
}) {
  return async function retryHandler<T>(
    action: () => Promise<T>,
    retryCount = 0,
  ): Promise<T> {
    try {
      return await new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error(TimeoutErrorMessage)),
          timeoutInMs,
        )

        action()
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

      logger.warn(
        {
          error: error instanceof Error ? error.message : undefined,
          retryCount,
          maxRetries,
        },
        'Retrying RPC Request',
      )

      return retryHandler(action, retryCount + 1)
    }
  }
}
