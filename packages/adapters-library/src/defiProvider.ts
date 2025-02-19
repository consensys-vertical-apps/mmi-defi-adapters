import { PublicKey } from '@solana/web3.js'
import Database from 'better-sqlite3'
import { getAddress } from 'ethers'
import {
  IMetadataProvider,
  buildSqliteMetadataProviders,
} from './SQLiteMetadataProvider'
import { buildVoidMetadataProviders } from './VoidMetadataProvider'
import { Protocol } from './adapters/protocols'

import { supportedProtocols } from './adapters/supportedProtocols'
import { Config, IConfig } from './config'
import { AdaptersController } from './core/adaptersController'
import { AVERAGE_BLOCKS_PER_DAY } from './core/constants/AVERAGE_BLOCKS_PER_DAY'
import { Chain, ChainIdToChainNameMap } from './core/constants/chains'

import { ChecksumAddress } from './core/decorators/checksumAddress'
import {
  NotSupportedError,
  NotSupportedUnlimitedGetLogsBlockRange,
} from './core/errors/errors'
import { getProfits } from './core/getProfits'
import { ChainProvider } from './core/provider/ChainProvider'
import { filterMapAsync } from './core/utils/filters'
import { logger } from './core/utils/logger'
import { propagatePrice } from './core/utils/propagatePrice'
import { unwrap } from './core/utils/unwrap'
import { count } from './metricsCount'
import {
  enrichMovements,
  enrichPositionBalance,
  enrichTotalValueLocked,
  enrichUnwrappedTokenExchangeRates,
} from './responseAdapters'
import { PoolFilter, buildProviderPoolFilter } from './tokenFilter'
import { IProtocolAdapter } from './types/IProtocolAdapter'
import { DeepPartial } from './types/deepPartial'
import {
  AdapterErrorResponse,
  AdapterResponse,
  DefiPositionResponse,
  PricePerShareResponse,
} from './types/response'
import {
  IUnwrapPriceCache,
  IUnwrapPriceCacheProvider,
  UnwrapPriceCache,
} from './unwrapCache'

export class DefiProvider {
  private parsedConfig
  chainProvider: ChainProvider
  adaptersController: AdaptersController

  private metadataProviders: Record<Chain, IMetadataProvider>
  private unwrapCache: IUnwrapPriceCache
  private poolFilter: PoolFilter

  constructor(
    config?: DeepPartial<IConfig>,
    metadataProviderSettings?: Record<
      Chain,
      {
        dbPath: string
        options: Database.Options
      }
    >,
    unwrapCacheProvider?: IUnwrapPriceCacheProvider,
    poolFilter?: PoolFilter,
  ) {
    this.parsedConfig = new Config(config)

    this.chainProvider = new ChainProvider(this.parsedConfig.values)

    this.metadataProviders = this.parsedConfig.values.useDatabase
      ? buildSqliteMetadataProviders(metadataProviderSettings)
      : buildVoidMetadataProviders()

    this.poolFilter =
      poolFilter ?? buildProviderPoolFilter(this.chainProvider.providers)

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
    const startGetPositions = Date.now()
    this.initAdapterControllerForUnwrapStage()

    const runner = async (adapter: IProtocolAdapter) => {
      const isSolanaAddress = this.isSolanaAddress(userAddress)
      if (
        (adapter.chainId === Chain.Solana && !isSolanaAddress) ||
        (adapter.chainId !== Chain.Solana && isSolanaAddress)
      ) {
        return { tokens: [] }
      }

      const blockNumber = blockNumbers?.[adapter.chainId]

      const protocolTokenAddresses = await this.getProtocolTokensFilter(
        userAddress,
        filterProtocolTokens,
        adapter,
      )

      if (protocolTokenAddresses && protocolTokenAddresses.length === 0) {
        return { tokens: [] }
      }

      const startTime = Date.now()

      const protocolPositions = await adapter.getPositions({
        userAddress,
        blockNumber,
        protocolTokenAddresses,
        tokenIds: filterTokenIds,
      })

      const getPositionsTime = Date.now()

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

      const getRewardTime = Date.now()

      await unwrap(
        adapter,
        blockNumber,
        protocolPositions,
        'balanceRaw',
        this.unwrapCache,
      )

      const unwrapTime = Date.now()

      const tokens = protocolPositions.map((protocolPosition) =>
        enrichPositionBalance(protocolPosition, adapter.chainId),
      )

      tokens.forEach((protocolPosition) =>
        protocolPosition.tokens?.forEach((token) =>
          propagatePrice(token, adapter.chainId),
        ),
      )

      const endTime = Date.now()

      logger.info({
        source: 'adapter:positions',
        startTime,
        endTime,
        timeTaken: endTime - startTime,
        timeDetails: {
          getPositionsTime: getPositionsTime - startTime,
          getRewardTime: getRewardTime - getPositionsTime,
          unwrapTime: unwrapTime - getRewardTime,
          enrichTime: endTime - unwrapTime,
        },
        chainId: adapter.chainId,
        chainName: ChainIdToChainNameMap[adapter.chainId],
        protocolId: adapter.protocolId,
        productId: adapter.productId,
        userAddress,
        blockNumber,
      })

      return { tokens }
    }

    const result = (
      await this.runForAllProtocolsAndChains({
        runner,
        filterProtocolIds,
        filterProductIds,
        filterChainIds,
      })
    ).filter(
      (result) =>
        !result.success || (result.success && result.tokens.length > 0),
    )

    const endGetPositions = Date.now()

    logger.info({
      source: 'positions',
      successfulResponses: result.filter((r) => r.success).length,
      failedResponses: result.filter((r) => !r.success).length,
      totalResponses: result.length,
      startTime: startGetPositions,
      endTime: endGetPositions,
      timeTaken: endGetPositions - startGetPositions,
      userAddress,
    })

    logger.debug(count, 'getPositions')

    return result
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
            chainName: ChainIdToChainNameMap[adapter.chainId],
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
  private async runForAllProtocolsAndChains<ReturnType extends object>({
    runner,
    filterProtocolIds,
    filterProductIds,
    filterChainIds,
  }: {
    runner: (adapter: IProtocolAdapter) => ReturnType
    filterProtocolIds?: Protocol[]
    filterProductIds?: string[]
    filterChainIds?: Chain[]
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
              !filterChainIds || filterChainIds.includes(+chainIdKey as Chain)
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
              .filter(([_, adapter]) => {
                return (
                  !filterProductIds ||
                  filterProductIds.includes(adapter.productId)
                )
              })
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

    try {
      const adapterResult = await runner(adapter)

      return {
        ...protocolDetails,
        chainName: ChainIdToChainNameMap[adapter.chainId],
        success: true,
        ...adapterResult,
      }
    } catch (error) {
      return {
        ...protocolDetails,
        chainName: ChainIdToChainNameMap[adapter.chainId],
        ...this.handleError(error),
      }
    }
  }

  private handleError(error: unknown): {
    success: false
  } & AdapterErrorResponse {
    let adapterError: AdapterErrorResponse['error']

    if (error instanceof Error) {
      adapterError = {
        message: error.message,
        details: { name: error.name },
      }
    } else if (typeof error === 'string') {
      adapterError = {
        message: error,
      }
    } else {
      adapterError = {
        message: 'Error message cannot be extracted',
      }
    }

    return {
      success: false,
      error: adapterError,
    }
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
    userAddress: string,
    filterProtocolTokens: string[] | undefined,
    adapter: IProtocolAdapter,
  ): Promise<string[] | undefined> {
    if (filterProtocolTokens) {
      return filterProtocolTokens
    }

    const poolFilterAddresses =
      adapter.chainId === Chain.Solana ||
      adapter.adapterSettings.userEvent === false
        ? undefined
        : await this.poolFilter(
            userAddress,
            adapter.chainId,
            adapter.adapterSettings,
          )

    if (!poolFilterAddresses) {
      return undefined
    }

    return await filterMapAsync(poolFilterAddresses, async (address) => {
      try {
        const protocolTokens = await adapter.getProtocolTokens()

        return protocolTokens.some((token) => token.address === address)
          ? address
          : undefined
      } catch (error) {
        return undefined
      }
    })
  }
}
