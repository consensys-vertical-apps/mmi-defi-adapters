import { CustomMulticallJsonRpcProvider } from './customMulticallJsonRpcProvider'
import { MulticallQueue } from './multicall'

describe('CustomMulticallJsonRpcProvider', () => {
  describe('call', () => {
    it('queues calls', async () => {
      const spy = jest.fn().mockResolvedValue('success')

      const multicallQueue = { queueCall: spy } as unknown as MulticallQueue

      const provider = new CustomMulticallJsonRpcProvider({
        url: 'www.oioi.com',
        chainId: 1,
        multicallQueue,
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
