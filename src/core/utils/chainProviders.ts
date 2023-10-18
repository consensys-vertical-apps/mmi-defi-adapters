import { Network, ethers } from 'ethers'
import { Config } from '../../config'
import { Multicall__factory } from '../../contracts'
import { Chain } from '../constants/chains'
import { MULTICALL_ADDRESS } from '../constants/MULTICALL_ADDRESS'
import { CustomMulticallJsonRpcProvider } from './CustomMulticallJsonRpcProvider'
import { logger } from './logger'
import { MulticallQueue } from './multicall'

export class ChainProvider {
  private config: Config
  providers: Record<Chain, ethers.JsonRpcProvider>

  constructor(config: Config) {
    this.config = config
    this.providers = this.initializeProviders()
  }

  private provider({
    url,
    chainId,
    enableMulticallQueue,
  }: {
    url: string
    chainId: Chain
    enableMulticallQueue: boolean
  }): ethers.JsonRpcProvider {
    if (!url) throw new Error('Url missing')

    if (!enableMulticallQueue) {
      logger.debug({ chainId }, `Using standard provider`)
      return new ethers.JsonRpcProvider(url, chainId, {
        staticNetwork: Network.from(chainId),
      })
    }

    logger.debug({ chainId }, 'Using multicall queue provider')

    const provider = new ethers.JsonRpcProvider(url, chainId)

    // deployed on 100+ chains at address
    // https://www.multicall3.com/deployments
    const multicallContract = Multicall__factory.connect(
      MULTICALL_ADDRESS,
      provider,
    )

    const multicallQueue = new MulticallQueue({
      flushTimeoutMs: 2,
      maxBatchSize: 100,
      multicallContract,
    })

    return new CustomMulticallJsonRpcProvider({
      url,
      network: chainId,
      multicallQueue,
    })
  }

  private initializeProviders() {
    return {
      [Chain.Ethereum]: this.provider({
        url: this.config.values.provider.ethereum,
        chainId: Chain.Ethereum,
        enableMulticallQueue: this.config.values.useMulticallInterceptor,
      }),
      [Chain.Optimism]: this.provider({
        url: this.config.values.provider.optimism,
        chainId: Chain.Optimism,
        enableMulticallQueue: this.config.values.useMulticallInterceptor,
      }),
      [Chain.Bsc]: this.provider({
        url: this.config.values.provider.bsc,
        chainId: Chain.Bsc,
        enableMulticallQueue: this.config.values.useMulticallInterceptor,
      }),
      [Chain.Polygon]: this.provider({
        url: this.config.values.provider.polygon,
        chainId: Chain.Polygon,
        enableMulticallQueue: this.config.values.useMulticallInterceptor,
      }),
      [Chain.Fantom]: this.provider({
        url: this.config.values.provider.fantom,
        chainId: Chain.Fantom,
        enableMulticallQueue: this.config.values.useMulticallInterceptor,
      }),
      [Chain.Arbitrum]: this.provider({
        url: this.config.values.provider.arbitrum,
        chainId: Chain.Arbitrum,
        enableMulticallQueue: this.config.values.useMulticallInterceptor,
      }),
      [Chain.Avalanche]: this.provider({
        url: this.config.values.provider.avalanche,
        chainId: Chain.Avalanche,
        enableMulticallQueue: this.config.values.useMulticallInterceptor,
      }),
      [Chain.Linea]: this.provider({
        url: this.config.values.provider.linea,
        chainId: Chain.Linea,
        enableMulticallQueue: this.config.values.useMulticallInterceptor,
      }),
      [Chain.Base]: this.provider({
        url: this.config.values.provider.base,
        chainId: Chain.Base,
        enableMulticallQueue: this.config.values.useMulticallInterceptor,
      }),
    }
  }
}
