import { Network } from 'ethers'
import { IConfig } from '../../config'
import { Multicall__factory } from '../../contracts'
import { Chain } from '../constants/chains'
import { MULTICALL_ADDRESS } from '../constants/MULTICALL_ADDRESS'
import { CustomJsonRpcProvider } from './customJsonRpcProvider'
import { CustomMulticallJsonRpcProvider } from './CustomMulticallJsonRpcProvider'
import { logger } from './logger'
import { MulticallQueue } from './multicall'

export class ChainProvider {
  providers: Record<Chain, CustomJsonRpcProvider>

  constructor(config: IConfig) {
    this.providers = this.initializeProviders(config)
  }

  private provider({
    url,
    chainId,
    enableMulticallQueue,
  }: {
    url: string
    chainId: Chain
    enableMulticallQueue: boolean
  }): CustomJsonRpcProvider {
    if (!url) {
      throw new Error('Url missing')
    }

    if (!enableMulticallQueue) {
      logger.debug({ chainId }, `Using standard provider`)
      return new CustomJsonRpcProvider({
        url,
        chainId,
        options: {
          staticNetwork: Network.from(chainId),
        },
      })
    }

    logger.debug({ chainId, url }, 'Using multicall queue provider')

    const provider = new CustomJsonRpcProvider({
      url,
      chainId,
      options: {
        staticNetwork: Network.from(chainId),
      },
    })

    // deployed on 100+ chains at address
    // https://www.multicall3.com/deployments
    const multicallContract = Multicall__factory.connect(
      MULTICALL_ADDRESS,
      provider,
    )

    const multicallQueue = new MulticallQueue({
      flushTimeoutMs: 0.01,
      maxBatchSize: 1000,
      multicallContract,
    })

    return new CustomMulticallJsonRpcProvider({
      url,
      chainId,
      multicallQueue,
      options: {
        staticNetwork: Network.from(chainId),
      },
    })
  }

  private initializeProviders(config: IConfig) {
    return {
      [Chain.Ethereum]: this.provider({
        url: config.provider.ethereum,
        chainId: Chain.Ethereum,
        enableMulticallQueue: config.useMulticallInterceptor,
      }),
      [Chain.Optimism]: this.provider({
        url: config.provider.optimism,
        chainId: Chain.Optimism,
        enableMulticallQueue: config.useMulticallInterceptor,
      }),
      [Chain.Bsc]: this.provider({
        url: config.provider.bsc,
        chainId: Chain.Bsc,
        enableMulticallQueue: config.useMulticallInterceptor,
      }),
      [Chain.Polygon]: this.provider({
        url: config.provider.polygon,
        chainId: Chain.Polygon,
        enableMulticallQueue: config.useMulticallInterceptor,
      }),
      [Chain.Fantom]: this.provider({
        url: config.provider.fantom,
        chainId: Chain.Fantom,
        enableMulticallQueue: config.useMulticallInterceptor,
      }),
      [Chain.Arbitrum]: this.provider({
        url: config.provider.arbitrum,
        chainId: Chain.Arbitrum,
        enableMulticallQueue: config.useMulticallInterceptor,
      }),
      [Chain.Avalanche]: this.provider({
        url: config.provider.avalanche,
        chainId: Chain.Avalanche,
        enableMulticallQueue: config.useMulticallInterceptor,
      }),
      [Chain.Linea]: this.provider({
        url: config.provider.linea,
        chainId: Chain.Linea,
        enableMulticallQueue: config.useMulticallInterceptor,
      }),
      [Chain.Base]: this.provider({
        url: config.provider.base,
        chainId: Chain.Base,
        enableMulticallQueue: config.useMulticallInterceptor,
      }),
    }
  }
}
