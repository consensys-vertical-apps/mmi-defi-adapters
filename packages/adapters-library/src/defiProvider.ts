import { PublicKey } from '@solana/web3.js'
import Database from 'better-sqlite3'
import { getAddress } from 'ethers'
import {
  IMetadataProvider,
  buildSqliteMetadataProviders,
} from './SQLiteMetadataProvider'
import { buildVoidMetadataProviders } from './VoidMetadataProvider'
import { Protocol, ProtocolDisplayName } from './adapters/protocols'
import { supportedProtocols } from './adapters/supportedProtocols'
import { Config, IConfig } from './config'
import { AdaptersController } from './core/adaptersController'
import { Chain, ChainName, EvmChain } from './core/constants/chains'
import { ChecksumAddress } from './core/decorators/checksumAddress'
import { ChainProvider } from './core/provider/ChainProvider'
import { TrustWalletProtocolIconMap } from './core/utils/buildIconUrl'
import { pascalCase } from './core/utils/caseConversion'
import { filterMapAsync } from './core/utils/filters'
import { logger } from './core/utils/logger'
import { propagatePrice } from './core/utils/propagatePrice'
import { unwrap } from './core/utils/unwrap'
import { count } from './metricsCount'
import {
  enrichPositionBalance,
  enrichUnwrappedTokenExchangeRates,
} from './responseAdapters'
import { PoolFilter, buildProviderPoolFilter } from './tokenFilter'
import { IProtocolAdapter, ProtocolToken } from './types/IProtocolAdapter'
import { DeepPartial } from './types/deepPartial'
import {
  AdapterResponse,
  DefiPositionResponse,
  PricePerShareResponse,
} from './types/response'
import {
  IUnwrapPriceCache,
  IUnwrapPriceCacheProvider,
  UnwrapPriceCache,
} from './unwrapCache'
import { AdapterPositionsMetrics } from './types/adapter'

export class DefiProvider {
  private config: IConfig
  chainProvider: ChainProvider
  adaptersController: AdaptersController

  private metadataProviders: Record<Chain, IMetadataProvider>
  private unwrapCache: IUnwrapPriceCache
  private poolFilter: PoolFilter
  private shouldUsePoolFilter: (adapter: IProtocolAdapter) => boolean

  constructor({
    config,
    metadataProviderSettings,
    unwrapCacheProvider,
    poolFilter,
  }: {
    config?: DeepPartial<IConfig>
    metadataProviderSettings?: Record<
      Chain,
      {
        dbPath: string
        options: Database.Options
      }
    >
    unwrapCacheProvider?: IUnwrapPriceCacheProvider
    poolFilter?: PoolFilter
  } = {}) {
    this.config = new Config(config).values

    this.chainProvider = new ChainProvider(this.config)

    this.metadataProviders = this.config.useDatabase
      ? buildSqliteMetadataProviders(metadataProviderSettings)
      : buildVoidMetadataProviders()

    if (poolFilter) {
      // If a pool filter is provided, we use it as long as the adapter has a userEvent
      this.poolFilter = poolFilter
      this.shouldUsePoolFilter = (adapter) =>
        !!adapter.adapterSettings.userEvent
    } else {
      // If no pool filter is provided, we use the default one and only use it if the adapter has Transfer event
      this.poolFilter = buildProviderPoolFilter(this.chainProvider.providers)
      this.shouldUsePoolFilter = (adapter) =>
        adapter.adapterSettings.userEvent === 'Transfer'
    }

    this.unwrapCache = new UnwrapPriceCache(unwrapCacheProvider)

    this.adaptersController = new AdaptersController({
      evmProviders: this.chainProvider.providers,
      solanaProvider: this.chainProvider.solanaProvider,
      supportedProtocols,
      metadataProviders: this.metadataProviders,
    })
  }

  async getStableBlockNumbers(
    filterChainIds?: Chain[],
  ): Promise<Partial<Record<Chain, number>>> {
    return Object.values(this.chainProvider.providers)
      .filter(
        (provider) =>
          !filterChainIds || filterChainIds.includes(provider.chainId),
      )
      .reduce(
        async (accumulator, provider) => {
          if (filterChainIds && !filterChainIds.includes(provider.chainId)) {
            return accumulator
          }

          return {
            ...(await accumulator),
            [provider.chainId]: await provider.getStableBlockNumber(),
          }
        },
        {} as Promise<Partial<Record<Chain, number>>>,
      )
  }

  @ChecksumAddress
  async getPositions({
    userAddress,
    filterProtocolIds,
    filterProductIds,
    filterChainIds,
    blockNumbers,
    filterProtocolTokens, // TODO: Use this
    filterTokenIds,
  }: {
    userAddress: string
    filterProtocolIds?: Protocol[]
    filterProductIds?: string[]
    filterChainIds?: Chain[]
    blockNumbers?: Partial<Record<Chain, number>>
    filterProtocolTokens?: string[]
    filterTokenIds?: string[]
  }): Promise<DefiPositionResponse[]> {
    const startTime = Date.now()

    // TODO: We need to remove this. It can make the whole process crash if this function throws as it's not awaited
    // It also does not need to be optimized for serverless
    this.initAdapterControllerForUnwrapStage()

    const userPoolsByChain = (
      await filterMapAsync(Object.values(EvmChain), async (chainId) => {
        if (filterChainIds && !filterChainIds.includes(chainId)) {
          return undefined
        }

        let contractAddresses: string[] | undefined
        try {
          contractAddresses = await this.poolFilter(userAddress, chainId)
        } catch (error) {
          contractAddresses = undefined
          logger.error(error)
        }

        return {
          chainId,
          contractAddresses,
        }
      })
    ).reduce(
      (acc, curr) => {
        acc[curr.chainId] = curr.contractAddresses
        return acc
      },
      {} as Partial<Record<EvmChain, string[]>>,
    )

    const userPoolFiltersFetchedTime = Date.now()

    const runner = async (
      adapter: IProtocolAdapter,
    ): Promise<{
      response: DefiPositionResponse
      metrics: AdapterPositionsMetrics
    }> => {
      const protocolDetails = adapter.getProtocolDetails()

      const adapterResponse = {
        ...protocolDetails,
        protocolDisplayName:
          ProtocolDisplayName[adapter.protocolId] ??
          pascalCase(adapter.protocolId),
        chainName: ChainName[adapter.chainId],
        iconUrl:
          TrustWalletProtocolIconMap[adapter.protocolId] ??
          protocolDetails.iconUrl,
      }

      const runnerStartTime = Date.now()

      const blockNumber = blockNumbers?.[adapter.chainId]

      try {
        const isSolanaAddress = this.isSolanaAddress(userAddress)
        if (
          (adapter.chainId === Chain.Solana && !isSolanaAddress) ||
          (adapter.chainId !== Chain.Solana && isSolanaAddress)
        ) {
          return {
            response: {
              ...adapterResponse,
              success: true,
              tokens: [],
            },
            metrics: {
              startTime: runnerStartTime,
              endTime: Date.now(),
              status: 'skipped:chain-address',
            },
          }
        }

        const protocolTokenAddresses = await this.getProtocolTokensFilter(
          filterProtocolTokens,
          userPoolsByChain,
          adapter,
        )

        if (protocolTokenAddresses && protocolTokenAddresses.length === 0) {
          return {
            response: {
              ...adapterResponse,
              success: true,
              tokens: [],
            },
            metrics: {
              startTime: runnerStartTime,
              endTime: Date.now(),
              status: 'skipped:filter-address',
            },
          }
        }

        const poolsFilteredTime = Date.now()

        const protocolPositions = await adapter.getPositions({
          userAddress,
          blockNumber,
          protocolTokenAddresses,
          tokenIds: filterTokenIds,
        })

        const positionsFetchedTime = Date.now()

        await Promise.all(
          protocolPositions.map(async (pos) => {
            const [rewards = [], extraRewards = []] = await Promise.all([
              adapter.getRewardPositions?.({
                userAddress,
                blockNumber,
                protocolTokenAddress: pos.address,
              }),
              adapter.getExtraRewardPositions?.({
                userAddress,
                blockNumber,
                protocolTokenAddress: pos.address,
              }),
            ])

            if (rewards.length > 0) {
              pos.tokens = [...(pos.tokens ?? []), ...rewards]
            }
            if (extraRewards.length > 0) {
              pos.tokens = [...(pos.tokens ?? []), ...extraRewards]
            }
          }),
        )

        const rewardsFetchedTime = Date.now()

        await unwrap(
          adapter,
          blockNumber,
          protocolPositions,
          'balanceRaw',
          this.unwrapCache,
        )

        const unwrapFinishedTime = Date.now()

        const tokens = protocolPositions.map((protocolPosition) =>
          enrichPositionBalance(protocolPosition, adapter.chainId),
        )

        tokens.forEach((protocolPosition) =>
          protocolPosition.tokens?.forEach((token) =>
            propagatePrice(token, adapter.chainId),
          ),
        )

        return {
          response: {
            ...adapterResponse,
            success: true,
            tokens,
          },
          metrics: {
            startTime: runnerStartTime,
            poolsFilteredTime,
            positionsFetchedTime,
            rewardsFetchedTime,
            unwrapFinishedTime,
            endTime: Date.now(),
            status: 'success',
          },
        }
      } catch (error) {
        const errorMessage = this.handleError(error)
        return {
          response: {
            ...adapterResponse,
            success: false,
            error: {
              message: errorMessage,
            },
          },
          metrics: {
            startTime: runnerStartTime,
            endTime: Date.now(),
            status: 'error',
            message: errorMessage,
          },
        }
      }
    }

    const results = await this.runForAllProtocolsAndChains2({
      runner,
      filterProtocolIds,
      filterProductIds,
      filterChainIds,
      useAdaptersWithUserEventOnly: this.config.useAdaptersWithUserEventOnly,
    })

    const endTime = Date.now()

    this.sendPositionsResponselogs(
      {
        startTime,
        userPoolFiltersFetchedTime,
        endTime,
      },
      results,
      userAddress,
    )

    return results
      .filter(
        ({ response }) =>
          !response.success || (response.success && response.tokens.length > 0),
      )
      .map(({ response }) => response)
  }

  @ChecksumAddress
  async unwrap({
    filterProtocolIds,
    filterProductIds,
    filterChainIds,
    filterProtocolToken,
    blockNumbers,
  }: {
    filterProtocolIds?: Protocol[]
    filterProductIds?: string[]
    filterChainIds?: Chain[]
    filterProtocolToken?: string
    blockNumbers?: Partial<Record<Chain, number>>
  }): Promise<PricePerShareResponse[]> {
    const runner = async (adapter: IProtocolAdapter) => {
      const blockNumber = blockNumbers?.[adapter.chainId]

      const protocolTokenAddresses = (await adapter.getProtocolTokens()).map(
        (token) => token.address,
      )

      if (
        filterProtocolToken &&
        !protocolTokenAddresses.includes(filterProtocolToken)
      ) {
        return { tokens: [] }
      }
      const protocolTokens = filterProtocolToken
        ? [filterProtocolToken]
        : protocolTokenAddresses

      const tokens = await Promise.all(
        protocolTokens.map(async (address) => {
          const startTime = Date.now()

          const unwrap = await this.unwrapCache.fetchUnwrapWithCache(adapter, {
            protocolTokenAddress: getAddress(address),
            blockNumber,
          })

          const endTime = Date.now()
          logger.info({
            source: 'adapter:unwrap',
            startTime,
            endTime,
            timeTaken: endTime - startTime,
            chainId: adapter.chainId,
            chainName: ChainName[adapter.chainId],
            protocolId: adapter.protocolId,
            productId: adapter.productId,
            protocolTokenAddress: getAddress(address),
            blockNumber,
          })

          return enrichUnwrappedTokenExchangeRates(unwrap, adapter.chainId)
        }),
      )

      return { tokens }
    }

    const result = await this.runForAllProtocolsAndChains({
      runner,
      filterProtocolIds,
      filterProductIds,
      filterChainIds,
    })

    // remove empty tokens this happens with filterProtocolToken is applied
    const filteredResult = result.filter(
      (result) =>
        !result.success || (result.success && result.tokens.length > 0),
    )

    return filteredResult
  }

  async getSupport(input?: {
    filterChainIds?: Chain[] | undefined
    filterProtocolIds?: Protocol[] | undefined
    includeProtocolTokens?: boolean
  }) {
    return await this.adaptersController.getSupport(input)
  }

  /**
   * Runs a specified method for all protocols and chains, based on the provided filters.
   * @param runner - The function to run for each protocol and chain.
   * @param filterProtocolIds - Optional. An array of protocols to filter by.
   * @param filterProductIds - Optional. An array of products to filter by.
   * @param filterChainIds - Optional. An array of chains to filter by.
   * @returns A promise that resolves to an array of adapter responses.
   */
  private async runForAllProtocolsAndChains2<ReturnType extends object>({
    runner,
    filterProtocolIds,
    filterProductIds,
    filterChainIds,
    useAdaptersWithUserEventOnly = false,
  }: {
    runner: (adapter: IProtocolAdapter) => ReturnType
    filterProtocolIds?: Protocol[]
    filterProductIds?: string[]
    filterChainIds?: Chain[]
    useAdaptersWithUserEventOnly?: boolean
  }): Promise<Awaited<ReturnType>[]> {
    const protocolPromises = Object.entries(supportedProtocols)
      .filter(
        ([protocolIdKey, _]) =>
          !filterProtocolIds ||
          filterProtocolIds.includes(protocolIdKey as Protocol),
      )
      .flatMap(([protocolIdKey, supportedChains]) => {
        const protocolId = protocolIdKey as Protocol

        // Object.entries casts the numeric key as a string. This reverses it
        return Object.entries(supportedChains)
          .filter(([chainIdKey, _]) => {
            return (
              (!filterChainIds ||
                filterChainIds.includes(+chainIdKey as Chain)) &&
              this.config.provider[ChainName[+chainIdKey as Chain]]
            )
          })
          .flatMap(([chainIdKey, _]) => {
            const chainId = +chainIdKey as Chain

            const chainProtocolAdapters =
              this.adaptersController.fetchChainProtocolAdapters(
                chainId,
                protocolId,
              )

            return Array.from(chainProtocolAdapters)
              .filter(
                ([_, adapter]) =>
                  (!filterProductIds ||
                    filterProductIds.includes(adapter.productId)) &&
                  (!useAdaptersWithUserEventOnly ||
                    adapter.adapterSettings.userEvent),
              )
              .map(([_, adapter]) => runner(adapter))
          })
      })

    const result = await Promise.all(protocolPromises)

    return result
  }

  /**
   * Runs a specified method for all protocols and chains, based on the provided filters.
   * @param runner - The function to run for each protocol and chain.
   * @param filterProtocolIds - Optional. An array of protocols to filter by.
   * @param filterProductIds - Optional. An array of products to filter by.
   * @param filterChainIds - Optional. An array of chains to filter by.
   * @returns A promise that resolves to an array of adapter responses.
   */
  private async runForAllProtocolsAndChains<ReturnType extends object>({
    runner,
    filterProtocolIds,
    filterProductIds,
    filterChainIds,
    useAdaptersWithUserEventOnly = false,
  }: {
    runner: (adapter: IProtocolAdapter) => ReturnType
    filterProtocolIds?: Protocol[]
    filterProductIds?: string[]
    filterChainIds?: Chain[]
    useAdaptersWithUserEventOnly?: boolean
  }): Promise<AdapterResponse<Awaited<ReturnType>>[]> {
    const protocolPromises = Object.entries(supportedProtocols)
      .filter(
        ([protocolIdKey, _]) =>
          !filterProtocolIds ||
          filterProtocolIds.includes(protocolIdKey as Protocol),
      )
      .flatMap(([protocolIdKey, supportedChains]) => {
        const protocolId = protocolIdKey as Protocol

        // Object.entries casts the numeric key as a string. This reverses it
        return Object.entries(supportedChains)
          .filter(([chainIdKey, _]) => {
            return (
              (!filterChainIds ||
                filterChainIds.includes(+chainIdKey as Chain)) &&
              this.config.provider[ChainName[+chainIdKey as Chain]]
            )
          })
          .flatMap(([chainIdKey, _]) => {
            const chainId = +chainIdKey as Chain

            const chainProtocolAdapters =
              this.adaptersController.fetchChainProtocolAdapters(
                chainId,
                protocolId,
              )

            return Array.from(chainProtocolAdapters)
              .filter(
                ([_, adapter]) =>
                  (!filterProductIds ||
                    filterProductIds.includes(adapter.productId)) &&
                  (!useAdaptersWithUserEventOnly ||
                    adapter.adapterSettings.userEvent),
              )
              .map(([_, adapter]) => this.runTaskForAdapter(adapter, runner))
          })
      })

    const result = await Promise.all(protocolPromises)

    return result
  }

  private async runTaskForAdapter<ReturnType>(
    adapter: IProtocolAdapter,
    runner: (adapter: IProtocolAdapter) => ReturnType,
  ): Promise<AdapterResponse<Awaited<ReturnType>>> {
    const protocolDetails = adapter.getProtocolDetails()

    const adapterResponse = {
      ...protocolDetails,
      protocolDisplayName:
        ProtocolDisplayName[adapter.protocolId] ??
        pascalCase(adapter.protocolId),
      chainName: ChainName[adapter.chainId],
      iconUrl:
        TrustWalletProtocolIconMap[adapter.protocolId] ??
        protocolDetails.iconUrl,
    }

    try {
      const adapterResult = await runner(adapter)

      return {
        ...adapterResponse,
        success: true,
        ...adapterResult,
      }
    } catch (error) {
      return {
        ...adapterResponse,
        success: false,
        error: {
          message: this.handleError(error),
        },
      }
    }
  }

  private handleError(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }

    if (typeof error === 'string') {
      return error
    }

    return String(error)
  }

  private initAdapterControllerForUnwrapStage() {
    this.adaptersController.init()
  }

  private isSolanaAddress(address: string) {
    try {
      new PublicKey(address)
      return true
    } catch (error) {
      return false
    }
  }

  private async getProtocolTokensFilter(
    filterProtocolTokens: string[] | undefined,
    userPoolsByChain: Partial<Record<EvmChain, string[]>>,
    adapter: IProtocolAdapter,
  ): Promise<string[] | undefined> {
    if (filterProtocolTokens) {
      return filterProtocolTokens
    }

    if (
      adapter.chainId === Chain.Solana ||
      !this.shouldUsePoolFilter(adapter)
    ) {
      return undefined
    }

    const poolFilterAddresses = userPoolsByChain[adapter.chainId]

    if (!poolFilterAddresses) {
      return undefined
    }

    let protocolTokens: ProtocolToken[] = []
    try {
      protocolTokens = await adapter.getProtocolTokens()
    } catch (error) {
      return undefined
    }

    return protocolTokens
      .filter((token) => poolFilterAddresses.includes(token.address))
      .map((token) => token.address)
  }

  private sendPositionsResponselogs(
    globalMetrics: {
      startTime: number
      userPoolFiltersFetchedTime: number
      endTime: number
    },
    results: {
      response: DefiPositionResponse
      metrics: AdapterPositionsMetrics
    }[],
    userAddress: string,
  ) {
    const loggableEntries = results.reduce(
      (acc, { response, metrics }) => {
        const timeTaken = metrics.endTime - metrics.startTime

        if (metrics.status === 'success') {
          acc.loggableResponses.push({
            chainId: response.chainId,
            chainName: response.chainName,
            protocolId: response.protocolId,
            productId: response.productId,
            status: metrics.status,
            startTime: metrics.startTime,
            endTime: metrics.endTime,
            timeTaken,
            timeDetails: {
              relativeStartTime: metrics.startTime - globalMetrics.startTime,
              createPoolsFilterTime:
                metrics.poolsFilteredTime - metrics.startTime,
              fetchPositionsTime:
                metrics.positionsFetchedTime - metrics.poolsFilteredTime,
              fetchRewardTime:
                metrics.rewardsFetchedTime - metrics.positionsFetchedTime,
              unwrapTime:
                metrics.unwrapFinishedTime - metrics.rewardsFetchedTime,
              enrichTime: metrics.endTime - metrics.unwrapFinishedTime,
            },
          })
        } else if (metrics.status === 'error') {
          acc.loggableResponses.push({
            chainId: response.chainId,
            chainName: response.chainName,
            protocolId: response.protocolId,
            productId: response.productId,
            status: metrics.status,
            startTime: metrics.startTime,
            endTime: metrics.endTime,
            timeTaken,
            message: metrics.message,
          })
        }

        if (timeTaken > acc.maxTimeTaken.timeTaken) {
          acc.maxTimeTaken.timeTaken = timeTaken

          acc.maxTimeTaken.loggableResponse =
            metrics.status !== 'success' && metrics.status !== 'error'
              ? {
                  chainId: response.chainId,
                  chainName: response.chainName,
                  protocolId: response.protocolId,
                  productId: response.productId,
                  status: metrics.status,
                  startTime: metrics.startTime,
                  endTime: metrics.endTime,
                  timeTaken,
                }
              : undefined
        }

        return acc
      },
      {
        loggableResponses: [],
        maxTimeTaken: {
          timeTaken: 0,
          loggableResponse: undefined,
        },
      } as {
        loggableResponses: Record<string, unknown>[]
        maxTimeTaken: {
          timeTaken: number
          loggableResponse: Record<string, unknown> | undefined
        }
      },
    )

    loggableEntries.loggableResponses.forEach((loggableEntry) => {
      logger.info({
        source: 'positions:adapter',
        ...loggableEntry,
      })
    })

    if (loggableEntries.maxTimeTaken.loggableResponse) {
      logger.info({
        source: 'positions:adapter',
        ...loggableEntries.maxTimeTaken.loggableResponse,
      })
    }

    logger.info({
      source: 'positions',
      successfulResponses: results.filter(
        (r) => r.response.success && r.response.tokens.length > 0,
      ).length,
      filteredResponses: results.filter(
        (r) => r.response.success && r.response.tokens.length === 0,
      ).length,
      failedResponses: results.filter((r) => !r.response.success).length,
      totalResponses: results.length,
      startTime: globalMetrics.startTime,
      endTime: globalMetrics.endTime,
      timeTaken: globalMetrics.endTime - globalMetrics.startTime,
      timeDetails: {
        userPoolsByChainTime:
          globalMetrics.userPoolFiltersFetchedTime - globalMetrics.startTime,
        fetchPositionsTime:
          globalMetrics.endTime - globalMetrics.userPoolFiltersFetchedTime,
      },
      userAddress,
    })

    logger.debug(count, 'getPositions')
  }
}
