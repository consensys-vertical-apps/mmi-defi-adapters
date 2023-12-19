import { JsonRpcApiProviderOptions, TransactionRequest } from 'ethers'
import { Chain } from '../constants/chains'
import { Cache } from '../decorators/Cache'
import { CustomJsonRpcProvider } from './customJsonRpcProvider'
import { MulticallQueue } from './multicall'

export interface CustomTransactionRequest extends TransactionRequest {
  blockTag?: number
}

export class CustomMulticallJsonRpcProvider extends CustomJsonRpcProvider {
  private multicallQueue: MulticallQueue
  constructor({
    url,
    chainId,
    multicallQueue,
    options,
  }: {
    url: string
    chainId: Chain
    multicallQueue: MulticallQueue
    options?: JsonRpcApiProviderOptions
  }) {
    super({ url, chainId, options })
    this.multicallQueue = multicallQueue
  }

  @Cache
  async call(transaction: CustomTransactionRequest): Promise<string> {
    if (transaction.from) {
      return super.call(transaction)
    }

    return this.multicallQueue.queueCall(transaction)
  }
}
