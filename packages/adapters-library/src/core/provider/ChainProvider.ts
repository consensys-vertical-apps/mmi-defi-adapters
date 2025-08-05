import { Connection } from '@solana/web3.js'
import { FetchRequest, Network } from 'ethers'
import { IConfig } from '../../config'
import { ChainName, EvmChain } from '../constants/chains'
import { logger } from '../utils/logger'
import {
  CustomJsonRpcProvider,
  CustomJsonRpcProviderOptions,
} from './CustomJsonRpcProvider'
import { CustomMulticallJsonRpcProvider } from './CustomMulticallJsonRpcProvider'
import https from 'node:https'

export const DEFAULT_HTTP_AGENT_OPTIONS: https.AgentOptions = {
  keepAlive: true, // Enable keep-alive to reuse connections
  keepAliveMsecs: 30000, // Keep-alive interval (30 seconds)
  maxSockets: 50, // Maximum number of active sockets
  maxFreeSockets: 20, // Maximum number of idle sockets in the pool
  timeout: 60000, // Free socket timeout (1 minute)
}

export class ChainProvider {
  providers: Partial<Record<EvmChain, CustomJsonRpcProvider>>
  solanaProvider: Connection

  private config: IConfig

  constructor(config: IConfig) {
    this.config = config
    this.providers = this.initializeEvmProviders(this.config)
    this.solanaProvider = new Connection(config.provider.solana)
  }

  private initializeEvmProviders(config: IConfig) {
    const commonProviderSettings = {
      enableMulticallQueue: config.useMulticallInterceptor,
      customOptions: {
        rpcCallTimeoutInMs: config.rpcCallTimeoutInMs,
        rpcCallRetries: config.rpcCallRetries,
        rpcGetLogsTimeoutInMs: config.rpcGetLogsTimeoutInMs,
        rpcGetLogsRetries: config.rpcGetLogsRetries,
        enableCache: config.enableRpcCache,
      },
      enableFailover: config.enableFailover,
    }

    const chains = Object.values(EvmChain)

    return chains.reduce(
      (providers, chainId) => {
        const chainName = ChainName[chainId]

        const providerUrl = config.provider[chainName]
        if (!providerUrl) {
          return providers
        }

        const maxBatchSize = config.maxBatchSize[chainName]
        if (!maxBatchSize) {
          throw new Error(`Max batch size is missing for ${chainName}`)
        }

        providers[chainId] = this.buildEvmProvider({
          ...commonProviderSettings,
          url: providerUrl,
          chainId,
          maxBatchSize,
        })

        return providers
      },
      {} as Record<EvmChain, CustomJsonRpcProvider>,
    )
  }

  private buildEvmProvider({
    url,
    chainId,
    enableMulticallQueue,
    customOptions,
    enableFailover,
    maxBatchSize,
  }: {
    url: string
    chainId: EvmChain
    enableMulticallQueue: boolean
    customOptions: CustomJsonRpcProviderOptions
    enableFailover: boolean
    maxBatchSize: number
  }): CustomJsonRpcProvider {
    const fetchRequest = new FetchRequest(url)

    fetchRequest.getUrlFunc = FetchRequest.createGetUrlFunc({
      options: DEFAULT_HTTP_AGENT_OPTIONS,
    })

    if (enableFailover) {
      fetchRequest.setHeader('Enable-Failover', 'true')
    }

    if (!enableMulticallQueue) {
      logger.debug({ chainId }, 'Using standard provider')
      return new CustomJsonRpcProvider({
        fetchRequest,
        chainId,
        customOptions,
        jsonRpcProviderOptions: {
          staticNetwork: Network.from(chainId),
          batchMaxCount: this.config.disableEthersBatching ? 1 : undefined,
        },
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
      maxBatchSize,
    })
  }
}
