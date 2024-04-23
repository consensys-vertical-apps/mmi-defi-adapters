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
  enableFailover: boolean
}

export class CustomJsonRpcProvider extends JsonRpcProvider {
  chainId: Chain

  callRetryHandler: ReturnType<typeof retryHandlerFactory>

  logsRetryHandler: ReturnType<typeof retryHandlerFactory>

  enableFailover: boolean

  constructor({
    url,
    chainId,
    customOptions: {
      rpcCallTimeoutInMs,
      rpcCallRetries,
      rpcGetLogsTimeoutInMs,
      rpcGetLogsRetries,
      enableFailover,
    },
    jsonRpcProviderOptions,
  }: {
    url: string
    chainId: Chain
    customOptions: CustomJsonRpcProviderOptions
    jsonRpcProviderOptions?: JsonRpcApiProviderOptions
  }) {
    super(url, chainId, jsonRpcProviderOptions)
    this.chainId = chainId
    this.callRetryHandler = retryHandlerFactory({
      timeoutInMs: rpcCallTimeoutInMs,
      maxRetries: rpcCallRetries,
    })
    this.logsRetryHandler = retryHandlerFactory({
      timeoutInMs: rpcGetLogsTimeoutInMs,
      maxRetries: rpcGetLogsRetries,
    })
    this.enableFailover = enableFailover
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

  // Set Enable-Failover header
  // Infura will forward rpc requests to backup provider incase of failures
  _getConnection(): FetchRequest {
    const request = super._getConnection()
    if (this.enableFailover) {
      request.setHeader('Enable-Failover', 'true')
    }
    return request
  }
}
