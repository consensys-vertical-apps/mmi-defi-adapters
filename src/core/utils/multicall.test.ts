import { Multicall } from '../../contracts'
import { MulticallQueue } from './multicall'

type TestCaseType = [
  string,
  {
    paramsArray: {
      to: string
      data: string
      blockTag?: number
      from?: string
    }[]

    mockResponseLength: number[] // to ensure error not triggered
  },
]

const testCases: TestCaseType[] = [
  [
    'sends separate batches',
    {
      paramsArray: [
        { to: '0x', data: '0x', blockTag: undefined },
        { to: '0x', data: '0x', blockTag: 100 },
      ],

      mockResponseLength: [1, 1],
    },
  ],

  [
    'sends 2 batches',
    {
      paramsArray: [
        { to: '0x', data: '0x', blockTag: undefined },
        { to: '0x', data: '0x', blockTag: undefined },
        { to: '0x', data: '0x', blockTag: 100 },
        { to: '0x', data: '0x', blockTag: 100 },
      ],

      mockResponseLength: [2, 2],
    },
  ],
]
describe('MulticallQueue', () => {
  beforeEach(() => {
    jest.useFakeTimers() // mock timers
  })

  afterEach(() => {
    jest.useRealTimers() // reset timers
  })

  describe('queueCall', () => {
    it.each(testCases)(
      '%s',
      async (_description, { paramsArray, mockResponseLength }) => {
        const flushTimeoutMs = 1

        const spy = jest.fn()
        mockResponseLength.forEach((length) => {
          spy.mockResolvedValueOnce(
            Array(length).fill({
              success: true,
              returnData: '0x',
            }),
          )
        })

        const multicall = new MulticallQueue({
          flushTimeoutMs,
          maxBatchSize: 3,
          multicallContract: {
            aggregate3: { staticCall: spy },
          } as unknown as Multicall,
        })

        const resultsPromises = paramsArray.map((params) => {
          const { to, data, blockTag, from } = params
          multicall.queueCall({ to, data, blockTag, from })
        })

        await Promise.all(resultsPromises)

        expect(spy).not.toHaveBeenCalled()
        // Await the timers properly
        jest.runAllTimers()
        await Promise.resolve() // Ensuring any micro-tasks are also completed
        expect(spy).toHaveBeenCalled()
      },
    )

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
          aggregate3: { staticCall: spy },
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

    it('blockTag sent with request', async () => {
      const spy = jest.fn().mockResolvedValue(
        Array(1).fill({
          success: true,
          returnData: '0x',
        }),
      )

      const multicall = new MulticallQueue({
        flushTimeoutMs: 10,
        maxBatchSize: 1,
        multicallContract: {
          aggregate3: { staticCall: spy },
        } as unknown as Multicall,
      })

      await multicall.queueCall({
        to: 'to',
        data: '0x',
        blockTag: 100,
      })

      expect(spy).toBeCalledWith(
        [{ allowFailure: true, callData: '0x', target: 'to' }],
        { blockTag: '0x64' },
      )
    })

    it('throws when "to" or "data" value missing', async () => {
      const multicall = new MulticallQueue({
        flushTimeoutMs: 10,
        maxBatchSize: 1,
        multicallContract: {
          aggregate3: { staticCall: {} },
        } as unknown as Multicall,
      })

      expect(
        multicall.queueCall({ to: undefined, data: '0x' }),
      ).rejects.toThrowError('To is required when using MulticallQueue')
      expect(
        multicall.queueCall({ to: '0x', data: undefined }),
      ).rejects.toThrowError('Data is required when using MulticallQueue')
      expect(
        multicall.queueCall({ to: undefined, data: undefined }),
      ).rejects.toThrowError(
        'To and Data are required when using MulticallQueue',
      )
    })
  })

  describe('_flush', () => {
    it('returns results', async () => {
      const spy = jest
        .fn()
        .mockResolvedValueOnce([{ success: true, returnData: '0x1' }])
        .mockResolvedValueOnce([{ success: true, returnData: '0x2' }])
      const multicall = new MulticallQueue({
        flushTimeoutMs: 10,
        maxBatchSize: 1,
        multicallContract: {
          aggregate3: { staticCall: spy },
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
          aggregate3: { staticCall: spy },
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
          aggregate3: { staticCall: spy },
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
})
