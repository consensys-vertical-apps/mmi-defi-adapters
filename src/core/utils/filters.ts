import { logger } from './logger'

export const fulfilledPromises = <Return>(
  results: PromiseSettledResult<Return>[],
): Return[] => {
  results.forEach((p) => {
    if (p.status !== 'fulfilled') {
      logger.error(p, 'Unfulfilled promise detected:')
    }
  })

  return results
    .filter(
      (p: PromiseSettledResult<Return>): p is PromiseFulfilledResult<Return> =>
        p.status === 'fulfilled',
    )
    .map((p) => p.value)
}

export const filterMap = <Input, Return>(
  array: Input[],
  callback: (value: Input, index: number, array: Input[]) => Return | undefined,
): Return[] => {
  return array
    .map(callback)
    .filter((result) => result !== undefined) as Return[]
}
