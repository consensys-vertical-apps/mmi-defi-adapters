import { CustomMulticallJsonRpcProvider } from './CustomMulticallJsonRpcProvider'
import { MulticallQueue } from './MulticallQueue'

describe('CustomMulticallJsonRpcProvider', () => {
  describe('call', () => {
    it('queues calls', async () => {
      const spy = jest.fn().mockResolvedValue('success')

      const multicallQueue = { queueCall: spy } as unknown as MulticallQueue

      const provider = new CustomMulticallJsonRpcProvider({
        url: 'www.oioi.com',
        chainId: 1,
        multicallQueue,
        customOptions: {
          rpcCallTimeoutInMs: 10000,
          rpcCallRetries: 1,
          rpcGetLogsTimeoutInMs: 10000,
          rpcGetLogsRetries: 1,
        },
      })

      const result = await provider.call({ to: '0x83', data: 'oioi' })

      expect(spy).toBeCalled()
      expect(result).toBe('success')
    })

    it('sends normal eth_call', async () => {
      const provider = new CustomMulticallJsonRpcProvider({
        url: 'www.oioi.com',
        chainId: 1,
        multicallQueue: {} as MulticallQueue,
        customOptions: {
          rpcCallTimeoutInMs: 10000,
          rpcCallRetries: 1,
          rpcGetLogsTimeoutInMs: 10000,
          rpcGetLogsRetries: 1,
        },
      })

      provider.call = jest.fn().mockResolvedValue('success')

      const result = await provider.call({
        to: '0x83',
        data: 'oioi',
        blockTag: 1000303,
      })

      expect(provider.call).toBeCalled()
      expect(result).toBe('success')
    })
  })
})
