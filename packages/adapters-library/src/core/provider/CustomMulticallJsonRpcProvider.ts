import {
  FetchRequest,
  Filter,
  FilterByBlockHash,
  JsonRpcApiProviderOptions,
  Log,
  TransactionRequest,
} from 'ethers'
import { count } from '../../metricsCount'
import { Chain } from '../constants/chains'
import {
  CustomJsonRpcProvider,
  CustomJsonRpcProviderOptions,
} from './CustomJsonRpcProvider'
import { MulticallQueue } from './MulticallQueue'

export class CustomMulticallJsonRpcProvider extends CustomJsonRpcProvider {
  private multicallQueue: MulticallQueue

  constructor({
    fetchRequest,
    chainId,
    customOptions,
    jsonRpcProviderOptions,
    hasUnlimitedGetLogsRange,
    maxBatchSize
  }: {
    fetchRequest: FetchRequest
    chainId: Chain
    customOptions: CustomJsonRpcProviderOptions
    jsonRpcProviderOptions?: JsonRpcApiProviderOptions
    hasUnlimitedGetLogsRange: boolean
    maxBatchSize: number
  }) {
    super({
      fetchRequest,
      chainId,
      customOptions,
      jsonRpcProviderOptions,
      hasUnlimitedGetLogsRange,
    })
    this.multicallQueue = new MulticallQueue({
      fetchRequest,
      maxBatchSize: 100,
      flushTimeoutMs: 1000,
      chainId,
    })
  }

  private async callSuper(transaction: TransactionRequest): Promise<string> {
    console.log('Super call')
    const startTime = Date.now()

    const result = super.call(transaction)

    const endTime = Date.now()
    const totalTime = endTime - startTime

    count[this.chainId].nonMulticallRequests.total += 1

    if (totalTime > count[this.chainId].nonMulticallRequests.maxRequestTime) {
      count[this.chainId].nonMulticallRequests.maxRequestTime = totalTime
    }

    return result
  }

  async call(transaction: TransactionRequest): Promise<string> {
    if (transaction.from) {
      console.log(transaction.from)
    }

    return transaction.from
      ? this.callSuper(transaction)
      : this.multicallQueue.queueCall(transaction)
  }
}
