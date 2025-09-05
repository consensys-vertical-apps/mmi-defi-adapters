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
import { IUnwrapCache, MemoryUnwrapCache } from './core/unwrapCache'
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
import { DefiPositionDetection } from './tokenFilter'
import { IProtocolAdapter, ProtocolToken } from './types/IProtocolAdapter'
import { DeepPartial } from './types/deepPartial'
import {
  AdapterErrorResponse,
  AdapterResponse,
  DefiPositionResponse,
  PricePerShareResponse,
} from './types/response'

export class DefiProvider {
  private readonly config: IConfig
  chainProvider: ChainProvider
  adaptersController: AdaptersController

  private readonly metadataProviders: Record<Chain, IMetadataProvider>
  private readonly unwrapCache: IUnwrapCache
  private readonly defiPoolDetection: DefiPositionDetection | (() => undefined)

  constructor({
    config,
    metadataProviderSettings,
    defiPositionDetection,
  }: {
    config?: DeepPartial<IConfig>
    metadataProviderSettings?: Record<
      Chain,
      {
        dbPath: string
        options: Database.Options
      }
    >
    defiPositionDetection?: DefiPositionDetection
  } = {}) {
    this.config = new Config(config).values

    this.chainProvider = new ChainProvider(this.config)

    this.metadataProviders = this.config.useDatabase
      ? buildSqliteMetadataProviders(metadataProviderSettings)
      : buildVoidMetadataProviders()

    this.defiPoolDetection =
      defiPositionDetection ??
      (() => {
        logger.info('DeFi pool detection is not set')

        return undefined
      })
    this.unwrapCache = new MemoryUnwrapCache()

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

    const userPoolsByChain = (
      await filterMapAsync(Object.values(EvmChain), async (chainId) => {
        if (filterChainIds && !filterChainIds.includes(chainId)) {
          return undefined
        }

        let contractAddresses: string[] | undefined
        let tokenIdsPerContractAddress: Record<string, string[]> | undefined
        try {
          const result = this.defiPoolDetection
            ? await this.defiPoolDetection(userAddress, chainId)
            : undefined

          if (result) {
            contractAddresses = result.contractAddresses
            tokenIdsPerContractAddress = result.tokenIds
          }
        } catch (error) {
          contractAddresses = undefined
          tokenIdsPerContractAddress = undefined
          logger.error(error)
        }

        return {
          chainId,
          contractAddresses,
          tokenIds: tokenIdsPerContractAddress,
        }
      })
    ).reduce(
      (acc, curr) => {
        acc[curr.chainId] = {
          contractAddresses: curr.contractAddresses || [],
          tokenIds: curr.tokenIds,
        }
        return acc
      },
      {} as Partial<
        Record<
          EvmChain,
          { contractAddresses: string[]; tokenIds?: Record<string, string[]> }
        >
      >,
    )

    const userPoolFiltersFetchedTime = Date.now()

    const runner = async (adapter: IProtocolAdapter) => {
      const runnerStartTime = Date.now()
      let poolsFilteredTime: number | undefined
      let positionsFetchedTime: number | undefined
      let rewardsFetchedTime: number | undefined
      let unwrapFinishedTime: number | undefined

      const blockNumber = blockNumbers?.[adapter.chainId]

      try {
        const isSolanaAddress = this.isSolanaAddress(userAddress)
        if (
          (adapter.chainId === Chain.Solana && !isSolanaAddress) ||
          (adapter.chainId !== Chain.Solana && isSolanaAddress)
        ) {
          return { tokens: [] }
        }

        const protocolTokenAddresses = await this.getProtocolTokensFilter(
          filterProtocolTokens,
          userPoolsByChain,
          adapter,
        )

        if (protocolTokenAddresses && protocolTokenAddresses.length === 0) {
          return { tokens: [] }
        }
        // Extract tokenIds from userPoolData for this adapter's chain
        const userPoolData = userPoolsByChain[adapter.chainId as EvmChain]
        const userTokenIds = userPoolData?.tokenIds
        const combinedTokenIds =
          userTokenIds && protocolTokenAddresses
            ? protocolTokenAddresses.flatMap(
                (address) => userTokenIds[address] || [],
              )
            : filterTokenIds

        const poolsFilteredTime = Date.now()

        const protocolPositions = await adapter.getPositions({
          userAddress,
          blockNumber,
          protocolTokenAddresses,
          tokenIds: combinedTokenIds,
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

        const runnerEndTime = Date.now()

        logger.info({
          source: 'adapter:positions:completed',
          startTime: runnerStartTime,
          endTime: runnerEndTime,
          timeTaken: runnerEndTime - runnerStartTime,
          timeDetails: {
            relativeStartTime: runnerStartTime - startTime,
            createPoolsFilterTime: poolsFilteredTime - runnerStartTime,
            fetchPositionsTime: positionsFetchedTime - poolsFilteredTime,
            fetchRewardTime: rewardsFetchedTime - positionsFetchedTime,
            unwrapTime: unwrapFinishedTime - rewardsFetchedTime,
            enrichTime: runnerEndTime - unwrapFinishedTime,
          },
          chainId: adapter.chainId,
          chainName: ChainName[adapter.chainId],
          protocolId: adapter.protocolId,
          productId: adapter.productId,
          userAddress,
          blockNumber,
        })

        return { tokens }
      } catch (error) {
        const runnerEndTime = Date.now()

        logger.info({
          source: 'adapter:positions:failed',
          startTime: runnerStartTime,
          endTime: runnerEndTime,
          timeTaken: runnerEndTime - runnerStartTime,
          timeDetails: {
            relativeStartTime: runnerStartTime - startTime,
            createPoolsFilterTime: poolsFilteredTime
              ? poolsFilteredTime - runnerStartTime
              : undefined,
            fetchPositionsTime: positionsFetchedTime
              ? positionsFetchedTime - poolsFilteredTime!
              : undefined,
            fetchRewardTime: rewardsFetchedTime
              ? rewardsFetchedTime - positionsFetchedTime!
              : undefined,
            unwrapTime: unwrapFinishedTime
              ? unwrapFinishedTime - rewardsFetchedTime!
              : undefined,
            enrichTime: runnerEndTime - unwrapFinishedTime!,
          },
          chainId: adapter.chainId,
          chainName: ChainName[adapter.chainId],
          protocolId: adapter.protocolId,
          productId: adapter.productId,
          userAddress,
          blockNumber,
        })

        throw error
      }
    }

    const result = (
      await this.runForAllProtocolsAndChains({
        runner,
        filterProtocolIds,
        filterProductIds,
        filterChainIds,
        useAdaptersWithUserEventOnly: this.config.useAdaptersWithUserEventOnly,
      })
    ).filter(
      (result) =>
        !result.success || (result.success && result.tokens.length > 0),
    )

    const endTime = Date.now()

    logger.info({
      source: 'positions',
      successfulResponses: result.filter((r) => r.success).length,
      failedResponses: result.filter((r) => !r.success).length,
      totalResponses: result.length,
      startTime,
      endTime,
      timeTaken: endTime - startTime,
      timeDetails: {
        userPoolsByChainTime: userPoolFiltersFetchedTime - startTime,
        fetchPositionsTime: endTime - userPoolFiltersFetchedTime,
      },
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
    filterProductIds?: string[] | undefined
    includeProtocolTokens?: boolean
    filterWhereUserEventMissing?: boolean
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

    try {
      const adapterResult = await runner(adapter)

      return {
        ...protocolDetails,
        protocolDisplayName:
          ProtocolDisplayName[adapter.protocolId] ??
          pascalCase(adapter.protocolId),
        chainName: ChainName[adapter.chainId],
        iconUrl:
          TrustWalletProtocolIconMap[adapter.protocolId] ??
          protocolDetails.iconUrl,
        success: true,
        ...adapterResult,
      }
    } catch (error) {
      return {
        ...protocolDetails,
        protocolDisplayName:
          ProtocolDisplayName[adapter.protocolId] ??
          pascalCase(adapter.protocolId),
        chainName: ChainName[adapter.chainId],
        iconUrl:
          TrustWalletProtocolIconMap[adapter.protocolId] ??
          protocolDetails.iconUrl,
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
    userPoolsByChain: Partial<
      Record<
        EvmChain,
        { contractAddresses: string[]; tokenIds?: Record<string, string[]> }
      >
    >,
    adapter: IProtocolAdapter,
  ): Promise<string[] | undefined> {
    if (filterProtocolTokens) {
      return filterProtocolTokens
    }

    if (adapter.chainId === Chain.Solana) {
      return undefined
    }

    const userPoolData = userPoolsByChain[adapter.chainId]

    if (!userPoolData?.contractAddresses) {
      return undefined
    }

    const poolFilterAddresses = userPoolData.contractAddresses

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
}
