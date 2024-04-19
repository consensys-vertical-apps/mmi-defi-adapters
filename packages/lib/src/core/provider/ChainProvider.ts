import { FetchRequest, Network } from 'ethers'
import { HttpsProxyAgent } from 'https-proxy-agent'
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
  }: {
    url: string
    chainId: Chain
    enableMulticallQueue: boolean
    customOptions: CustomJsonRpcProviderOptions
  }): CustomJsonRpcProvider {
    if (!url) {
      throw new Error('Url missing')
    }

    const newUrl = url

    if (chainId === 1) {
      console.log('RPC SETUP', {
        chainId,
        url,
        newUrl,
      })
    }

    // Set Enable-Failover header
    // Infura will forward rpc requests to backup provider incase of failures
    // const fetchRequest = new FetchRequest(url)
    const fetchRequest = new FetchRequest('/foo')
    fetchRequest.setHeader('Enable-Failover', 'true')

    if (!enableMulticallQueue) {
      logger.debug({ chainId }, `Using standard provider`)
      return new CustomJsonRpcProvider({
        fetchRequest,
        url: newUrl,
        chainId,
        customOptions,
        jsonRpcProviderOptions: {
          staticNetwork: Network.from(chainId),
        },
      })
    }

    logger.debug({ chainId, newUrl }, 'Using multicall queue provider')

    const provider = new CustomJsonRpcProvider({
      fetchRequest,
      url: newUrl,
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
      rpcGetLogsTimeoutInMs: config.rpcGetLogsTimeoutInMs,
      rpcGetLogsRetries: config.rpcGetLogsRetries,
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
