import {
  FetchRequest,
  Filter,
  FilterByBlockHash,
  JsonRpcApiProviderOptions,
  Log,
  TransactionRequest,
} from 'ethers'
import { Chain } from '../constants/chains'
import {
  CustomJsonRpcProvider,
  CustomJsonRpcProviderOptions,
} from './CustomJsonRpcProvider'
import { MulticallQueue } from './MulticallQueue'

export interface CustomTransactionRequest extends TransactionRequest {
  blockTag?: number
}

type CacheEntryCalls = { result: string; timestamp: number }
type CacheEntryLogs = { result: Array<Log>; timestamp: number }

const THIRTY_MINUTES = 30 * 60 * 1000

export class CustomMulticallJsonRpcProvider extends CustomJsonRpcProvider {
  private multicallQueue: MulticallQueue
  private cacheCalls: Record<string, Promise<CacheEntryCalls>>
  private cacheLogs: Record<string, Promise<CacheEntryLogs>>

  constructor({
    fetchRequest,
    chainId,
    multicallQueue,
    customOptions,
    jsonRpcProviderOptions,
  }: {
    fetchRequest: FetchRequest
    chainId: Chain
    multicallQueue: MulticallQueue
    customOptions: CustomJsonRpcProviderOptions
    jsonRpcProviderOptions?: JsonRpcApiProviderOptions
  }) {
    super({ fetchRequest, chainId, customOptions, jsonRpcProviderOptions })
    this.multicallQueue = multicallQueue
    this.cacheCalls = {}
    this.cacheLogs = {}
  }

  async call(transaction: CustomTransactionRequest): Promise<string> {
    const key = JSON.stringify(transaction)

    const cachedEntryPromise = this.cacheCalls[key]

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

    this.cacheCalls[key] = entryPromise

    return (await entryPromise).result
  }

  async getLogs(filter: Filter | FilterByBlockHash): Promise<Array<Log>> {
    const key = JSON.stringify(filter)

    const cachedEntryPromise = this.cacheLogs[key]

    if (cachedEntryPromise) {
      const now = Date.now()

      const entry = await cachedEntryPromise

      if (now - entry.timestamp < THIRTY_MINUTES) {
        return entry.result
      }
    }

    const entryPromise = (async () => {
      const result = super.getLogs(filter)

      return {
        result: await result,
        timestamp: Date.now(),
      }
    })()

    this.cacheLogs[key] = entryPromise

    return (await entryPromise).result
  }
}
