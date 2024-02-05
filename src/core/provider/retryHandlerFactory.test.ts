import { retryHandlerFactory } from './retryHandlerFactory'

describe('retryHandlerFactory', () => {
  it('returns the result if the call is successful', async () => {
    const retryHandler = retryHandlerFactory({
      timeoutInMs: 1000,
      maxRetries: 0,
    })

    const result = await retryHandler(async () => {
      return {}
    })

    expect(result).toEqual({})
  })

  it('throws if the timeout is reached', async () => {
    const retryHandler = retryHandlerFactory({
      timeoutInMs: 1,
      maxRetries: 0,
    })

    await expect(
      retryHandler(async () => {
        return await new Promise((resolve) => {
          setTimeout(() => {
            resolve(undefined)
          }, 1000)
        })
      }),
    ).rejects.toThrow('Operation timed out')
  })

  it('does not retry and throws in the error is not a timeout', async () => {
    const retryHandler = retryHandlerFactory({
      timeoutInMs: 1,
      maxRetries: 1,
    })

    const call = jest.fn().mockRejectedValueOnce(new Error('Not a timeout'))

    await expect(retryHandler(call)).rejects.toThrow('Not a timeout')

    expect(call).toBeCalledTimes(1)
  })

  it('retries once if the timeout is reached', async () => {
    const retryHandler = retryHandlerFactory({
      timeoutInMs: 1,
      maxRetries: 1,
    })

    const call = jest
      .fn()
      .mockRejectedValueOnce(new Error('Operation timed out'))
      .mockResolvedValueOnce({})

    const result = await retryHandler(call)

    expect(result).toEqual({})

    expect(call).toBeCalledTimes(2)
  })
})
