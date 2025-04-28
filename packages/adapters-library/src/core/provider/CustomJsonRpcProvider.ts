import {
  FetchRequest,
  Filter,
  FilterByBlockHash,
  JsonRpcApiProviderOptions,
  JsonRpcProvider,
  Log,
  TransactionRequest,
  ethers,
} from 'ethers'
import { count } from '../../metricsCount'
import { AVERAGE_BLOCKS_PER_10_MINUTES } from '../constants/AVERAGE_BLOCKS_PER_10_MINS'
import { Chain, EvmChain } from '../constants/chains'
import { NotSupportedUnlimitedGetLogsBlockRange } from '../errors/errors'
import { retryHandlerFactory } from './retryHandlerFactory'

export type CustomJsonRpcProviderOptions = {
  rpcCallTimeoutInMs: number
  rpcCallRetries: number
  rpcGetLogsTimeoutInMs: number
  rpcGetLogsRetries: number
  enableCache: boolean
}
const THIRTY_MINUTES = 30 * 60 * 1000

type CacheEntryCalls = { result: string; timestamp: number }
type CacheEntryLogs = { result: Array<Log>; timestamp: number }

export class CustomJsonRpcProvider extends JsonRpcProvider {
  readonly chainId: EvmChain

  private readonly _hasUnlimitedGetLogsRange: boolean
  private readonly _enableCache: boolean

  private readonly cacheCalls: Record<string, Promise<CacheEntryCalls>>
  private readonly cacheLogs: Record<string, Promise<CacheEntryLogs>>

  private readonly callRetryHandler: ReturnType<typeof retryHandlerFactory>
  private readonly logsRetryHandler: ReturnType<typeof retryHandlerFactory>

  constructor({
    fetchRequest,
    chainId,
    customOptions: {
      rpcCallTimeoutInMs,
      rpcCallRetries,
      rpcGetLogsTimeoutInMs,
      rpcGetLogsRetries,
      enableCache,
    },
    jsonRpcProviderOptions,
    hasUnlimitedGetLogsRange,
  }: {
    fetchRequest: FetchRequest
    chainId: EvmChain
    customOptions: CustomJsonRpcProviderOptions
    jsonRpcProviderOptions?: JsonRpcApiProviderOptions
    hasUnlimitedGetLogsRange: boolean
  }) {
    super(fetchRequest, chainId, jsonRpcProviderOptions)
    this.chainId = chainId
    this.callRetryHandler = retryHandlerFactory({
      timeoutInMs: rpcCallTimeoutInMs,
      maxRetries: rpcCallRetries,
    })
    this.logsRetryHandler = retryHandlerFactory({
      timeoutInMs: rpcGetLogsTimeoutInMs,
      maxRetries: rpcGetLogsRetries,
    })
    this.cacheCalls = {}
    this.cacheLogs = {}

    this._hasUnlimitedGetLogsRange = hasUnlimitedGetLogsRange
    this._enableCache = enableCache
  }

  /**
   * Returns 10 min old blockNumber to ensure data has propagated across nodes
   * Getting logs close to head has issues
   * @returns
   */
  async getStableBlockNumber(): Promise<number> {
    const currentBlockNumber = await this.getBlockNumber()

    const blocksToMoveBack = (() => {
      switch (this.chainId) {
        case Chain.Arbitrum:
          return AVERAGE_BLOCKS_PER_10_MINUTES[this.chainId] / 4
        default:
          return AVERAGE_BLOCKS_PER_10_MINUTES[this.chainId]
      }
    })()

    const stableBlockNumber = currentBlockNumber - blocksToMoveBack
    return stableBlockNumber >= 0 ? stableBlockNumber : 0
  }

  async call(transaction: TransactionRequest): Promise<string> {
    const callHandler = async () => {
      const result = this.callRetryHandler(() => super.call(transaction))

      return {
        result: await result,
        timestamp: Date.now(),
      }
    }

    if (!this._enableCache) {
      return (await callHandler()).result
    }

    const key = JSON.stringify({
      ...transaction,
      chainId: transaction.chainId?.toString(), // JSON.stringify cannot serialize bigints by default
    })

    const cachedEntryPromise = this.cacheCalls[key]

    if (cachedEntryPromise) {
      const now = Date.now()

      const entry = await cachedEntryPromise

      if (now - entry.timestamp < THIRTY_MINUTES) {
        return entry.result
      }
    }

    const entryPromise = callHandler()

    this.cacheCalls[key] = entryPromise

    return (await entryPromise).result
  }

  async getLogs(filter: Filter | FilterByBlockHash): Promise<Array<Log>> {
    const getLogsHandler = async () => {
      const result = this.logsRetryHandler(() => super.getLogs(filter))

      return {
        result: await result,
        timestamp: Date.now(),
      }
    }

    if (!this._enableCache) {
      return (await getLogsHandler()).result
    }

    const startTime = Date.now()
    const key = JSON.stringify(filter)

    const cachedEntryPromise = this.cacheLogs[key]

    if (cachedEntryPromise) {
      const now = Date.now()

      const entry = await cachedEntryPromise

      if (now - entry.timestamp < THIRTY_MINUTES) {
        return entry.result
      }
    }

    const entryPromise = getLogsHandler()

    this.cacheLogs[key] = entryPromise

    const result = (await entryPromise).result

    const endTime = Date.now()

    // update metrics
    const totalTime = endTime - startTime
    count[this.chainId].logRequests.total += 1

    if (totalTime > count[this.chainId].logRequests.maxRequestTime) {
      count[this.chainId].logRequests.maxRequestTime = totalTime
    }

    return result
  }

  async getAllTransferLogsToAddress(address: string): Promise<Array<Log>> {
    if (!this._hasUnlimitedGetLogsRange) {
      throw new NotSupportedUnlimitedGetLogsBlockRange()
    }

    if (this.chainId === Chain.Polygon) {
      const transferEventSignature = ethers.id(
        'Transfer(address,address,uint256)',
      )

      const transferFilter = {
        fromBlock: 0,
        toBlock: 'latest',
        topics: [
          transferEventSignature,
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          ethers.zeroPadValue(address, 32), // to address
        ],
      }

      return this.getLogs(transferFilter)
    }

    const transferEventSignature = ethers.id(
      'Transfer(address,address,uint256)',
    )

    const transferFilter = {
      fromBlock: 0,
      toBlock: 'latest',
      topics: [
        transferEventSignature,
        null,
        ethers.zeroPadValue(address, 32), // to address
      ],
    }

    return this.getLogs(transferFilter)
  }

  public get hasUnlimitedGetLogsRange(): boolean {
    return this._hasUnlimitedGetLogsRange
  }
}
