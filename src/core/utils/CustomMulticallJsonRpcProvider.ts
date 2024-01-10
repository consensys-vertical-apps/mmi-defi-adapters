import { JsonRpcApiProviderOptions, TransactionRequest } from 'ethers'
import { Chain } from '../constants/chains'
import { CustomJsonRpcProvider } from './customJsonRpcProvider'
import { MulticallQueue } from './multicall'

export interface CustomTransactionRequest extends TransactionRequest {
  blockTag?: number
}

type CacheEntry = { result: string; timestamp: number }

const THIRTY_MINUTES = 30 * 60 * 1000

export class CustomMulticallJsonRpcProvider extends CustomJsonRpcProvider {
  private multicallQueue: MulticallQueue
  private cache: Record<string, Promise<CacheEntry>>

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
    this.cache = {}
  }

  async call(transaction: CustomTransactionRequest): Promise<string> {
    const key = JSON.stringify(transaction)

    const cachedEntryPromise = this.cache[key]

    if (cachedEntryPromise) {
      const now = Date.now()

      const entry = await cachedEntryPromise

      if (now - entry.timestamp < THIRTY_MINUTES) {
        return entry.result
      }
    }

    const entryPromise = (async () => {
      const result = transaction.from
        ? super.call(transaction)
        : this.multicallQueue.queueCall(transaction)

      return {
        result: await result,
        timestamp: Date.now(),
      }
    })()

    this.cache[key] = entryPromise

    return (await entryPromise).result
  }
}
