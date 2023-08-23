import { logger } from './logger'

export const fulfilledPromises = <T>(
  results: PromiseSettledResult<T>[],
): T[] => {
  results.forEach((p) => {
    if (p.status !== 'fulfilled') {
      logger.error(p, 'Unfulfilled promise detected:')
    }
  })

  return results
    .filter(
      <T>(p: PromiseSettledResult<T>): p is PromiseFulfilledResult<T> =>
        p.status === 'fulfilled',
    )
    .map((p) => p.value)
}

export const filterMap = <T, U>(
  array: T[],
  callback: (value: T, index: number, array: T[]) => U | undefined,
): U[] => {
  return array.map(callback).filter((result) => result !== undefined) as U[]
}
