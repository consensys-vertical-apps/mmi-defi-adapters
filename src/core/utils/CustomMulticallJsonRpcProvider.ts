import { TransactionRequest } from 'ethers'
import { Chain } from '../constants/chains'
import { CustomJsonRpcProvider } from './customJsonRpcProvider'
import { logger } from './logger'
import { MulticallQueue } from './multicall'

export class CustomMulticallJsonRpcProvider extends CustomJsonRpcProvider {
  private multicallQueue: MulticallQueue
  constructor({
    url,
    chainId,
    multicallQueue,
  }: {
    url: string
    chainId: Chain
    multicallQueue: MulticallQueue
  }) {
    super({ url, chainId })
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
