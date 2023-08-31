import { CustomMulticallJsonRpcProvider } from './CustomMulticallJsonRpcProvider'
import { MulticallQueue } from './multicall'

describe('CustomMultiCallProvider', () => {
  it('Instance of', () => {
    const CustomerMulticallJsonRpcProvider = new CustomMulticallJsonRpcProvider(
      { url: 'www.oioi.com', network: 1, multicallQueue: {} as MulticallQueue },
    )

    expect(CustomerMulticallJsonRpcProvider).toBeInstanceOf(
      CustomMulticallJsonRpcProvider,
    )
  })
  it('queues calls', async () => {
    const spy = jest.fn().mockResolvedValue('success')

    const multicallQueue = { queueCall: spy } as unknown as MulticallQueue

    const provider = new CustomMulticallJsonRpcProvider({
      url: 'www.oioi.com',
      network: 1,
      multicallQueue,
    })

    const result = await provider.call({ to: '0x83', data: 'oioi' }, undefined)

    expect(spy).toBeCalled()
    expect(result).toBe('success')
  })

  it('sends normal eth_call', async () => {
    const provider = new CustomMulticallJsonRpcProvider({
      url: 'www.oioi.com',
      network: 1,
      multicallQueue: {} as MulticallQueue,
    })

    provider.call = jest.fn().mockResolvedValue('success')

    const result = await provider.call({ to: '0x83', data: 'oioi' }, 1000303)

    expect(provider.call).toBeCalled()
    expect(result).toBe('success')
  })
})
