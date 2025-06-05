import { describe, expect, it } from 'vitest'
import { TIMEOUT_ERROR_MESSAGE, withTimeout } from './with-timeout'

describe('withTimeout', () => {
  it('returns the result of the promise if it resolves before the timeout', async () => {
    const promise = Promise.resolve('success')
    const result = await withTimeout(promise, 100)
    expect(result).toBe('success')
  })

  it('rejects with a timeout error if the promise does not resolve before the timeout', async () => {
    const promise = new Promise((resolve) =>
      setTimeout(() => resolve('success'), 200),
    )
    await expect(withTimeout(promise, 50)).rejects.toThrowError(
      TIMEOUT_ERROR_MESSAGE,
    )
  })
})
