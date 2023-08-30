import { Multicall } from '../../contracts'
import { MulticallQueue } from './multicall'

describe('Multicall Configuration', () => {
  beforeEach(() => {
    jest.useFakeTimers() // mock timers
  })

  afterEach(() => {
    jest.useRealTimers() // reset timers
  })

  it('Instance of', () => {
    const multicall = new MulticallQueue({
      batchIntervalMs: 1000,
      maxBatchSize: 10,
      multicallContract: {} as any,
    })

    expect(multicall).toBeInstanceOf(MulticallQueue)
  })
  it('Multicall should be called 2 times', async () => {
    const spy = jest
      .fn()
      .mockResolvedValue([{ success: true, returnData: '0x' }])

    const multicall = new MulticallQueue({
      batchIntervalMs: 1000000,
      maxBatchSize: 10,
      multicallContract: {
        callStatic: { aggregate3: spy },
      } as unknown as Multicall,
    })

    const promises = []
    for (let i = 0; i < 22; i++) {
      promises.push(multicall.queueCall({ to: '0x', data: '0x' }))
    }

    expect(spy).toBeCalledTimes(2)
  })
  it('calls the async function only after 1 second', () => {
    const spy = jest
      .fn()
      .mockResolvedValue([{ success: true, returnData: '0x' }])
    const multicall = new MulticallQueue({
      batchIntervalMs: 1000,
      maxBatchSize: 10,
      multicallContract: {
        callStatic: { aggregate3: spy },
      } as unknown as Multicall,
    })

    const promises = []
    for (let i = 0; i < 2; i++) {
      promises.push(multicall.queueCall({ to: '0x', data: '0x' }))
    }
    expect(spy).not.toHaveBeenCalled()
    jest.advanceTimersByTime(999)
    expect(spy).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)

    expect(spy).toHaveBeenCalled()
  })

  it('returns result', async () => {
    const spy = jest.fn().mockResolvedValue([
      { success: true, returnData: '0x1' },
      { success: true, returnData: '0x2' },
    ])
    const multicall = new MulticallQueue({
      batchIntervalMs: 10,
      maxBatchSize: 1,
      multicallContract: {
        callStatic: { aggregate3: spy },
      } as unknown as Multicall,
    })

    const result = multicall.queueCall({ to: '0x', data: '0x' })
    const result2 = multicall.queueCall({ to: '0x', data: '0x' })
    expect(spy).toHaveBeenCalled()
    expect(await result).toEqual('0x1')
    expect(await result2).toEqual('0x1')
  })

  it('throws result', async () => {
    const spy = jest.fn().mockResolvedValueOnce([
      { success: false, returnData: '0x1' },
      { success: false, returnData: '0x2' },
    ])
    const multicall = new MulticallQueue({
      batchIntervalMs: 1000,
      maxBatchSize: 2,
      multicallContract: {
        callStatic: { aggregate3: spy },
      } as unknown as Multicall,
    })

    multicall
      .queueCall({ to: '0x', data: '0x' })
      .catch((result) => expect(result).toEqual('0x1'))

    multicall
      .queueCall({ to: '0x', data: '0x' })
      .catch((result) => expect(result).toEqual('0x2'))
  })
})
