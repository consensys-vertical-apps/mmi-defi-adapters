import { JsonRpcApiProviderOptions, JsonRpcProvider } from 'ethers'
import { AVERAGE_BLOCKS_PER_10_MINUTES } from '../constants/AVERAGE_BLOCKS_PER_10_MINS'
import { Chain } from '../constants/chains'

export class CustomJsonRpcProvider extends JsonRpcProvider {
  chainId: Chain
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
}
