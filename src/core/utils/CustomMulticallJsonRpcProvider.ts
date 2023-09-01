import { providers } from 'ethers'
import { MulticallQueue } from './multicall'
import { logger } from './logger'

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
    if (blockTag) {
      logger.debug('Intercepted eth_call, using multicall queue implementation')
      return super.call(transaction, blockTag)
    }

    logger.debug('Intercepted eth_call, using multicall queue implementation')

    return this.multicallQueue.queueCall(transaction)
  }
}
