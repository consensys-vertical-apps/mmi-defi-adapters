import {
  FetchRequest,
  Filter,
  FilterByBlockHash,
  JsonRpcApiProviderOptions,
  JsonRpcProvider,
  Log,
  TransactionRequest,
} from 'ethers'
import { AVERAGE_BLOCKS_PER_10_MINUTES } from '../constants/AVERAGE_BLOCKS_PER_10_MINS'
import { Chain } from '../constants/chains'
import { retryHandlerFactory } from './retryHandlerFactory'

export type CustomJsonRpcProviderOptions = {
  rpcCallTimeoutInMs: number
  rpcCallRetries: number
  rpcGetLogsTimeoutInMs: number
  rpcGetLogsRetries: number
}

export class CustomJsonRpcProvider extends JsonRpcProvider {
  chainId: Chain

  callRetryHandler: ReturnType<typeof retryHandlerFactory>

  logsRetryHandler: ReturnType<typeof retryHandlerFactory>

  constructor({
    fetchRequest,
    chainId,
    customOptions: {
      rpcCallTimeoutInMs,
      rpcCallRetries,
      rpcGetLogsTimeoutInMs,
      rpcGetLogsRetries,
    },
    jsonRpcProviderOptions,
  }: {
    fetchRequest: FetchRequest
    chainId: Chain
    customOptions: CustomJsonRpcProviderOptions
    jsonRpcProviderOptions?: JsonRpcApiProviderOptions
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
  }

  /**
   * Returns 10 min old blockNumber to ensure data has propagated across nodes
   * Getting logs close to head has issues
   * @returns
   */
  async getStableBlockNumber(): Promise<number> {
    const currentBlockNumber = await this.getBlockNumber()

    const blockNumberTenMinsAgo =
      currentBlockNumber - (AVERAGE_BLOCKS_PER_10_MINUTES[this.chainId] ?? 0) // default to 0 to avoid failures
    return blockNumberTenMinsAgo
  }

  async call(transaction: TransactionRequest): Promise<string> {
    return this.callRetryHandler(() => super.call(transaction))
  }

  async getLogs(filter: Filter | FilterByBlockHash): Promise<Array<Log>> {
    return this.logsRetryHandler(() => super.getLogs(filter))
  }
}
