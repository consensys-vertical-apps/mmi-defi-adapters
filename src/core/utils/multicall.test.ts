import { Multicall } from '../../contracts'
import { MulticallQueue } from './multicall'

describe('Multicall Configuration', () => {
  beforeEach(() => {
    jest.useFakeTimers() // mock timers
  })

  afterEach(() => {
    jest.useRealTimers() // reset timers
  })

  it('is a instance of', () => {
    const multicall = new MulticallQueue({
      flushTimeoutMs: 1000,
      maxBatchSize: 10,
      multicallContract: {} as Multicall,
    })

    expect(multicall).toBeInstanceOf(MulticallQueue)
  })
  it('sends batch size of 10', async () => {
    const maxBatchSize = 10
    const spy = jest.fn().mockResolvedValue(
      Array(maxBatchSize).fill({
        success: true,
        returnData: '0x',
      }),
    )

    const multicall = new MulticallQueue({
      flushTimeoutMs: 1000000,
      maxBatchSize,
      multicallContract: {
        callStatic: { aggregate3: spy },
      } as unknown as Multicall,
    })

    Array.from({ length: 22 }, () =>
      multicall.queueCall({ to: '0x', data: '0x' }),
    )

    expect(spy).toBeCalledTimes(2)
  })
  it('queues calls for 1 second', () => {
    const spy = jest.fn().mockResolvedValue(
      Array(2).fill({
        success: true,
        returnData: '0x',
      }),
    )
    const multicall = new MulticallQueue({
      flushTimeoutMs: 1000,
      maxBatchSize: 10,
      multicallContract: {
        callStatic: { aggregate3: spy },
      } as unknown as Multicall,
    })

    Array.from({ length: 2 }, () =>
      multicall.queueCall({ to: '0x', data: '0x' }),
    )
    expect(spy).not.toHaveBeenCalled()
    jest.advanceTimersByTime(999)
    expect(spy).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)

    expect(spy).toHaveBeenCalled()
  })

  it('returns results', async () => {
    const spy = jest
      .fn()
      .mockResolvedValueOnce([{ success: true, returnData: '0x1' }])
      .mockResolvedValueOnce([{ success: true, returnData: '0x2' }])
    const multicall = new MulticallQueue({
      flushTimeoutMs: 10,
      maxBatchSize: 1,
      multicallContract: {
        callStatic: { aggregate3: spy },
      } as unknown as Multicall,
    })

    const result = multicall.queueCall({ to: '0x', data: '0x' })
    const result2 = multicall.queueCall({ to: '0x', data: '0x' })
    expect(spy).toHaveBeenCalled()
    expect(await result).toEqual('0x1')
    expect(await result2).toEqual('0x2')
  })

  it('throws mismatch multicall result length', async () => {
    expect.assertions(2)
    const spy = jest.fn().mockResolvedValue([
      { success: true, returnData: '0x1' },
      { success: true, returnData: '0x2' },
    ])

    const multicall = new MulticallQueue({
      flushTimeoutMs: 10,
      maxBatchSize: 1,
      multicallContract: {
        callStatic: { aggregate3: spy },
      } as unknown as Multicall,
    })
    await multicall.queueCall({ to: '0x', data: '0x' }).catch((error) => {
      expect(error).toEqual('Multicall batch failed')
    })

    expect(spy).toHaveBeenCalled()
  })

  it('throws result from rejected call', async () => {
    const spy = jest.fn().mockResolvedValueOnce([
      { success: false, returnData: 'protected smart contract method' },
      { success: false, returnData: 'protected smart contract method 2' },
    ])
    const multicall = new MulticallQueue({
      flushTimeoutMs: 1000,
      maxBatchSize: 2,
      multicallContract: {
        callStatic: { aggregate3: spy },
      } as unknown as Multicall,
    })

    multicall
      .queueCall({ to: '0x', data: '0x' })
      .catch((result) =>
        expect(result).toEqual('protected smart contract method'),
      )

    multicall
      .queueCall({ to: '0x', data: '0x' })
      .catch((result) =>
        expect(result).toEqual('protected smart contract method 2'),
      )
  })
})
