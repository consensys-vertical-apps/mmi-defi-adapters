import { providers } from 'ethers'
import { MulticallQueue } from './multicall'

export class CustomMulticallJsonRpcProvider extends providers.StaticJsonRpcProvider {
  private multicallQueue: MulticallQueue
  constructor({
    url,
    network,
    multicallQueue,
  }: {
    url: string
    network: providers.Networkish
    multicallQueue: MulticallQueue
  }) {
    super(url, network)
    this.multicallQueue = multicallQueue
  }

  async call(
    transaction: providers.TransactionRequest,
    blockTag?: providers.BlockTag | Promise<providers.BlockTag>,
  ): Promise<string> {
    console.log('Intercepted eth_call')

    if (blockTag) {
      return super.call(transaction, blockTag)
    }

    return this.multicallQueue.queueCall(transaction)
  }
}
