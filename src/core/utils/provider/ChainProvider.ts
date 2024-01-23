import { Network } from 'ethers'
import { IConfig } from '../../../config'
import { Multicall__factory } from '../../../contracts'
import { Chain } from '../../constants/chains'
import { MULTICALL_ADDRESS } from '../../constants/MULTICALL_ADDRESS'
import { logger } from '../logger'
import { CustomJsonRpcProvider } from './CustomJsonRpcProvider'
import { CustomMulticallJsonRpcProvider } from './CustomMulticallJsonRpcProvider'
import { MulticallQueue } from './MulticallQueue'

export class ChainProvider {
  providers: Record<Chain, CustomJsonRpcProvider>

  constructor(config: IConfig) {
    this.providers = this.initializeProviders(config)
  }

  private provider({
    url,
    chainId,
    enableMulticallQueue,
    customOptions,
  }: {
    url: string
    chainId: Chain
    enableMulticallQueue: boolean
    customOptions: { rpcCallTimeoutInMs: number; rpcCallRetries: number }
  }): CustomJsonRpcProvider {
    if (!url) {
      throw new Error('Url missing')
    }

    if (!enableMulticallQueue) {
      logger.debug({ chainId }, `Using standard provider`)
      return new CustomJsonRpcProvider({
        url,
        chainId,
        customOptions,
        jsonRpcProviderOptions: {
          staticNetwork: Network.from(chainId),
        },
      })
    }

    logger.debug({ chainId, url }, 'Using multicall queue provider')

    const provider = new CustomJsonRpcProvider({
      url,
      chainId,
      customOptions,
      jsonRpcProviderOptions: {
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
      // Allow a bigger batch size for mainnet
      maxBatchSize: Chain.Ethereum ? 200 : 100,
      flushTimeoutMs: 0.1,
      multicallContract,
      chainId,
    })

    return new CustomMulticallJsonRpcProvider({
      url,
      chainId,
      multicallQueue,
      customOptions,
      jsonRpcProviderOptions: {
        staticNetwork: Network.from(chainId),
      },
    })
  }

  private initializeProviders(config: IConfig) {
    const customOptions = {
      rpcCallTimeoutInMs: config.rpcCallTimeoutInMs,
      rpcCallRetries: config.rpcCallRetries,
    }
    return {
      [Chain.Ethereum]: this.provider({
        url: config.provider.ethereum,
        chainId: Chain.Ethereum,
        enableMulticallQueue: config.useMulticallInterceptor,
        customOptions,
      }),
      [Chain.Optimism]: this.provider({
        url: config.provider.optimism,
        chainId: Chain.Optimism,
        enableMulticallQueue: config.useMulticallInterceptor,
        customOptions,
      }),
      [Chain.Bsc]: this.provider({
        url: config.provider.bsc,
        chainId: Chain.Bsc,
        enableMulticallQueue: config.useMulticallInterceptor,
        customOptions,
      }),
      [Chain.Polygon]: this.provider({
        url: config.provider.polygon,
        chainId: Chain.Polygon,
        enableMulticallQueue: config.useMulticallInterceptor,
        customOptions,
      }),
      [Chain.Fantom]: this.provider({
        url: config.provider.fantom,
        chainId: Chain.Fantom,
        enableMulticallQueue: config.useMulticallInterceptor,
        customOptions,
      }),
      [Chain.Arbitrum]: this.provider({
        url: config.provider.arbitrum,
        chainId: Chain.Arbitrum,
        enableMulticallQueue: config.useMulticallInterceptor,
        customOptions,
      }),
      [Chain.Avalanche]: this.provider({
        url: config.provider.avalanche,
        chainId: Chain.Avalanche,
        enableMulticallQueue: config.useMulticallInterceptor,
        customOptions,
      }),
      [Chain.Linea]: this.provider({
        url: config.provider.linea,
        chainId: Chain.Linea,
        enableMulticallQueue: config.useMulticallInterceptor,
        customOptions,
      }),
      [Chain.Base]: this.provider({
        url: config.provider.base,
        chainId: Chain.Base,
        enableMulticallQueue: config.useMulticallInterceptor,
        customOptions,
      }),
    }
  }
}
