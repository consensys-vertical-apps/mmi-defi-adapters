import { FetchRequest, Network } from 'ethers'
import { Config, IConfig } from '../../config'
import { Multicall__factory } from '../../contracts'
import { MULTICALL_ADDRESS } from '../constants/MULTICALL_ADDRESS'
import { Chain, ChainName } from '../constants/chains'
import { logger } from '../utils/logger'
import {
  CustomJsonRpcProvider,
  CustomJsonRpcProviderOptions,
} from './CustomJsonRpcProvider'
import { CustomMulticallJsonRpcProvider } from './CustomMulticallJsonRpcProvider'
import { MulticallQueue } from './MulticallQueue'

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
      logger.debug({ chainId }, 'Using standard provider')
      return new CustomJsonRpcProvider({
        config: this.config,
        fetchRequest,
        chainId,
        customOptions,
        jsonRpcProviderOptions: {
          staticNetwork: Network.from(chainId),
        },
        hasUnlimitedGetLogsRange:
          this.config.hasUnlimitedEthGethLogsBlockRangeLimit[
            ChainName[
              chainId
            ] as keyof typeof this.config.hasUnlimitedEthGethLogsBlockRangeLimit
          ],
      })
    }

    logger.debug({ chainId, url }, 'Using multicall queue provider')

    return new CustomMulticallJsonRpcProvider({
      config: this.config,
      fetchRequest,
      chainId,
      customOptions,
      jsonRpcProviderOptions: {
        staticNetwork: Network.from(chainId),
      },
      hasUnlimitedGetLogsRange:
        this.config.hasUnlimitedEthGethLogsBlockRangeLimit[
          ChainName[
            chainId
          ] as keyof typeof this.config.hasUnlimitedEthGethLogsBlockRangeLimit
        ],
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
