import { FetchRequest, Network } from 'ethers'
import { IConfig } from '../../config'
import { Multicall__factory } from '../../contracts'
import { Chain } from '../constants/chains'
import { MULTICALL_ADDRESS } from '../constants/MULTICALL_ADDRESS'
import { logger } from '../utils/logger'
import {
  CustomJsonRpcProvider,
  CustomJsonRpcProviderOptions,
} from './CustomJsonRpcProvider'
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
    enableFailover,
  }: {
    url: string
    chainId: Chain
    enableMulticallQueue: boolean
    customOptions: CustomJsonRpcProviderOptions
    enableFailover: boolean
  }): CustomJsonRpcProvider {
    if (!url) {
      throw new Error('Url missing')
    }

    // Set Enable-Failover header
    // Infura will forward rpc requests to backup provider incase of failures
    const fetchRequest = new FetchRequest(url)
    if (enableFailover) {
      fetchRequest.setHeader('Enable-Failover', 'true')
    }

    if (!enableMulticallQueue) {
      logger.debug({ chainId }, `Using standard provider`)
      return new CustomJsonRpcProvider({
        fetchRequest,
        chainId,
        customOptions,
        jsonRpcProviderOptions: {
          staticNetwork: Network.from(chainId),
        },
      })
    }

    logger.debug({ chainId, url }, 'Using multicall queue provider')

    const provider = new CustomJsonRpcProvider({
      fetchRequest,
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
      maxBatchSize: 100,
      flushTimeoutMs: 0.1,
      multicallContract,
      chainId,
    })

    return new CustomMulticallJsonRpcProvider({
      fetchRequest,
      chainId,
      multicallQueue,
      customOptions,
      jsonRpcProviderOptions: {
        staticNetwork: Network.from(chainId),
      },
    })
  }

  private initializeProviders(config: IConfig) {
    const commonProviderSettings = {
      enableMulticallQueue: config.useMulticallInterceptor,
      customOptions: {
        rpcCallTimeoutInMs: config.rpcCallTimeoutInMs,
        rpcCallRetries: config.rpcCallRetries,
        rpcGetLogsTimeoutInMs: config.rpcGetLogsTimeoutInMs,
        rpcGetLogsRetries: config.rpcGetLogsRetries,
      },
      enableFailover: config.enableFailover,
    }

    return {
      [Chain.Ethereum]: this.provider({
        ...commonProviderSettings,
        url: config.provider.ethereum,
        chainId: Chain.Ethereum,
      }),
      [Chain.Optimism]: this.provider({
        ...commonProviderSettings,
        url: config.provider.optimism,
        chainId: Chain.Optimism,
      }),
      [Chain.Bsc]: this.provider({
        ...commonProviderSettings,
        url: config.provider.bsc,
        chainId: Chain.Bsc,
      }),
      [Chain.Polygon]: this.provider({
        ...commonProviderSettings,
        url: config.provider.polygon,
        chainId: Chain.Polygon,
      }),
      [Chain.Fantom]: this.provider({
        ...commonProviderSettings,
        url: config.provider.fantom,
        chainId: Chain.Fantom,
      }),
      [Chain.Arbitrum]: this.provider({
        ...commonProviderSettings,
        url: config.provider.arbitrum,
        chainId: Chain.Arbitrum,
      }),
      [Chain.Avalanche]: this.provider({
        ...commonProviderSettings,
        url: config.provider.avalanche,
        chainId: Chain.Avalanche,
      }),
      [Chain.Linea]: this.provider({
        ...commonProviderSettings,
        url: config.provider.linea,
        chainId: Chain.Linea,
      }),
      [Chain.Base]: this.provider({
        ...commonProviderSettings,
        url: config.provider.base,
        chainId: Chain.Base,
      }),
    }
  }
}
