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
        url: this.config.getConfigObject().get('provider.ethereum'),
        chainId: Chain.Ethereum,
        enableMulticallQueue: this.config
          .getConfigObject()
          .get('useMulticallInterceptor'),
      }),
      [Chain.Optimism]: this.provider({
        url: this.config.getConfigObject().get('provider.optimism'),
        chainId: Chain.Optimism,
        enableMulticallQueue: this.config
          .getConfigObject()
          .get('useMulticallInterceptor'),
      }),
      [Chain.Bsc]: this.provider({
        url: this.config.getConfigObject().get('provider.bsc'),
        chainId: Chain.Bsc,
        enableMulticallQueue: this.config
          .getConfigObject()
          .get('useMulticallInterceptor'),
      }),
      [Chain.Polygon]: this.provider({
        url: this.config.getConfigObject().get('provider.polygon'),
        chainId: Chain.Polygon,
        enableMulticallQueue: this.config
          .getConfigObject()
          .get('useMulticallInterceptor'),
      }),
      [Chain.Fantom]: this.provider({
        url: this.config.getConfigObject().get('provider.fantom'),
        chainId: Chain.Fantom,
        enableMulticallQueue: this.config
          .getConfigObject()
          .get('useMulticallInterceptor'),
      }),
      [Chain.Arbitrum]: this.provider({
        url: this.config.getConfigObject().get('provider.arbitrum'),
        chainId: Chain.Arbitrum,
        enableMulticallQueue: this.config
          .getConfigObject()
          .get('useMulticallInterceptor'),
      }),
      [Chain.Avalanche]: this.provider({
        url: this.config.getConfigObject().get('provider.avalanche'),
        chainId: Chain.Avalanche,
        enableMulticallQueue: this.config
          .getConfigObject()
          .get('useMulticallInterceptor'),
      }),
      [Chain.Linea]: this.provider({
        url: this.config.getConfigObject().get('provider.linea'),
        chainId: Chain.Linea,
        enableMulticallQueue: this.config
          .getConfigObject()
          .get('useMulticallInterceptor'),
      }),
      [Chain.Base]: this.provider({
        url: this.config.getConfigObject().get('provider.base'),
        chainId: Chain.Base,
        enableMulticallQueue: this.config
          .getConfigObject()
          .get('useMulticallInterceptor'),
      }),
    }
  }
}
