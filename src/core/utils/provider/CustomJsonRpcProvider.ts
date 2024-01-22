import {
  JsonRpcApiProviderOptions,
  JsonRpcProvider,
  TransactionRequest,
} from 'ethers'
import { AVERAGE_BLOCKS_PER_10_MINUTES } from '../../constants/AVERAGE_BLOCKS_PER_10_MINS'
import { Chain } from '../../constants/chains'
import { retryHandlerFactory } from './retryHandlerFactory'

export class CustomJsonRpcProvider extends JsonRpcProvider {
  chainId: Chain

  retryHandler: <T>(call: () => Promise<T>, retryCount?: number) => Promise<T>

  constructor({
    url,
    chainId,
    options,
  }: {
    url: string
    options?: JsonRpcApiProviderOptions
    chainId: Chain
  }) {
    super(url, chainId, options)
    this.chainId = chainId
    // TODO - Inject handler
    this.retryHandler = retryHandlerFactory({
      timeoutInMs: 10000,
      maxRetries: 1,
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
    return this.retryHandler(() => super.call(transaction))
  }
}
