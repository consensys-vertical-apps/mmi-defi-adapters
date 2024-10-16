import { FetchRequest, Network } from 'ethers'
import { Config, type IConfig } from '../../config.js'
import { Multicall__factory } from '../../contracts/index.js'
import { MULTICALL_ADDRESS } from '../constants/MULTICALL_ADDRESS.js'
import { Chain, ChainIdToChainNameMap } from '../constants/chains.js'
import { logger } from '../utils/logger.js'
import {
  CustomJsonRpcProvider,
  type CustomJsonRpcProviderOptions,
} from './CustomJsonRpcProvider.js'
import { CustomMulticallJsonRpcProvider } from './CustomMulticallJsonRpcProvider.js'

export class ChainProvider {
  providers: Record<Chain, CustomJsonRpcProvider>

  private config: IConfig

  constructor(config: IConfig) {
    this.config = config
    this.providers = this.initializeProviders(this.config)
  }

  private provider({
    url,
    chainId,
    enableMulticallQueue,
    customOptions,
    enableFailover,
    maxBatchSize,
  }: {
    url: string
    chainId: Chain
    enableMulticallQueue: boolean
    customOptions: CustomJsonRpcProviderOptions
    enableFailover: boolean
    maxBatchSize: number
  }): CustomJsonRpcProvider {
    const fetchRequest = new FetchRequest(url)

    if (enableFailover) {
      fetchRequest.setHeader('Enable-Failover', 'true')
    }

    const hasUnlimitedGetLogsRange =
      this.config.hasUnlimitedEthGethLogsBlockRangeLimit[
        ChainIdToChainNameMap[chainId]
      ]

    if (!enableMulticallQueue) {
      logger.debug({ chainId }, 'Using standard provider')
      return new CustomJsonRpcProvider({
        fetchRequest,
        chainId,
        customOptions,
        jsonRpcProviderOptions: {
          staticNetwork: Network.from(chainId),
        },
        hasUnlimitedGetLogsRange,
      })
    }

    logger.debug({ chainId, url }, 'Using multicall queue provider')

    return new CustomMulticallJsonRpcProvider({
      fetchRequest,
      chainId,
      customOptions,
      jsonRpcProviderOptions: {
        staticNetwork: Network.from(chainId),
      },
      hasUnlimitedGetLogsRange,
      maxBatchSize,
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

    const chains = Object.values(Chain) as Chain[]

    return chains.reduce(
      (providers, chainId) => {
        const chainName = ChainIdToChainNameMap[chainId]

        // Throw an error if the provider URL is missing for this chain
        const providerUrl = config.provider[chainName]
        if (!providerUrl) {
          throw new Error(`Provider URL is missing for ${chainName}`)
        }

        const maxBatchSize = config.maxBatchSize[chainName]
        if (!maxBatchSize) {
          throw new Error(`Max batch size is missing for ${chainName}`)
        }

        providers[chainId] = this.provider({
          ...commonProviderSettings,
          url: providerUrl,
          chainId,
          maxBatchSize,
        })

        return providers
      },
      {} as Record<Chain, CustomJsonRpcProvider>,
    )
  }
}
