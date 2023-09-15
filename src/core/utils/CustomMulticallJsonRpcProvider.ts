import { JsonRpcProvider, Networkish, TransactionRequest } from 'ethers'
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

  async call(transaction: TransactionRequest): Promise<string> {
    logger.debug(
      transaction,
      'Intercepted eth_call, using multicall queue implementation',
    )
    if (transaction.blockTag) {
      return super.call(transaction)
    }

    return this.multicallQueue.queueCall(transaction)
  }
}
