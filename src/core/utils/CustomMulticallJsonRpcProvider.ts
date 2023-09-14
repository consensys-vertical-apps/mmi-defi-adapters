import {
  BlockTag,
  JsonRpcProvider,
  Networkish,
  TransactionRequest,
} from 'ethers'
import { logger } from './logger'
import { MulticallQueue } from './multicall'

export class CustomMulticallJsonRpcProvider extends JsonRpcProvider {
  private multicallQueue: MulticallQueue
  constructor({
    url,
    network,
    multicallQueue,
  }: {
    url: string
    network: Networkish
    multicallQueue: MulticallQueue
  }) {
    super(url, network)
    this.multicallQueue = multicallQueue
  }

  async call(
    transaction: TransactionRequest,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<string> {
    if (blockTag) {
      logger.debug('Intercepted eth_call, using multicall queue implementation')
      return super.call(transaction, blockTag)
    }

    logger.debug('Intercepted eth_call, using multicall queue implementation')

    return this.multicallQueue.queueCall(transaction)
  }
}
