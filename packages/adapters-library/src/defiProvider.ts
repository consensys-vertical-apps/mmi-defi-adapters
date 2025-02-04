import { PublicKey } from '@solana/web3.js'
import Database from 'better-sqlite3'
import { getAddress } from 'ethers'
import {
  IMetadataProvider,
  buildSqliteMetadataProviders,
} from './SQLiteMetadataProvider'
import { buildVoidMetadataProviders } from './VoidMetadataProvider'
import { JitoJitosolAdapter } from './adapters/jito/products/jitosol/jitoJitosolAdapter'
import { Protocol } from './adapters/protocols'
import type { GetTransactionParams } from './adapters/supportedProtocols'
import { supportedProtocols } from './adapters/supportedProtocols'
import { Config, IConfig } from './config'
import { AdaptersController } from './core/adaptersController'
import { AVERAGE_BLOCKS_PER_DAY } from './core/constants/AVERAGE_BLOCKS_PER_DAY'
import { Chain, ChainIdToChainNameMap, EvmChain } from './core/constants/chains'
import { TimePeriod } from './core/constants/timePeriod'
import { ChecksumAddress } from './core/decorators/checksumAddress'
import {
  NotSupportedError,
  NotSupportedUnlimitedGetLogsBlockRange,
  TvlValidationError,
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
import { IProtocolAdapter } from './types/IProtocolAdapter'
import { DeepPartial } from './types/deepPartial'
import {
  AdapterErrorResponse,
  AdapterResponse,
  DefiMovementsResponse,
  DefiPositionResponse,
  DefiProfitsResponse,
  GetEventsRequestInput,
  PricePerShareResponse,
  TotalValueLockResponse,
} from './types/response'
import {
  IUnwrapPriceCache,
  IUnwrapPriceCacheProvider,
  UnwrapPriceCache,
} from './unwrapCache'
import {
  buildCachePoolFilter,
  buildProviderPoolFilter,
  PoolFilter,
} from './tokenFilter'
import path from 'node:path'

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

    this.poolFilter = (() => {
      if (poolFilter) {
        return poolFilter
      }

      if (this.parsedConfig.values.usePositionsCache) {
        logger.info('Filter: Using positions cache')
        return buildCachePoolFilter(
          Object.values(EvmChain).reduce(
            (acc, chainId) => {
              if (chainId !== EvmChain.Ethereum) {
                return acc
              }

              acc[chainId] = new Database(
                path.join(
                  __dirname,
                  '../../..',
                  `${ChainIdToChainNameMap[chainId]}_index_history.db`,
                ),
                {
                  readonly: true,
                },
              )
              return acc
            },
            {} as Record<EvmChain, Database.Database>,
          ),
        )
      }

      logger.info('Filter: Using provider pool filter')
      return buildProviderPoolFilter(this.chainProvider.providers)
    })()

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

      const poolFilterAddresses =
        adapter.chainId === Chain.Solana ||
        adapter.adapterSettings.userEvent === false
          ? undefined
          : await this.poolFilter(
              userAddress,
              adapter.chainId,
              adapter.adapterSettings,
            )

      console.log(
        'POOL FILTER ADDRESSES',
        poolFilterAddresses,
        (await adapter.getProtocolTokens())[0]!.address,
      )

      const protocolTokenAddresses = !poolFilterAddresses
        ? undefined
        : await filterMapAsync(poolFilterAddresses, async (address) => {
            try {
              const protocolTokens = await adapter.getProtocolTokens()

              return protocolTokens.some((token) => token.address === address)
                ? address
                : undefined
            } catch (error) {
              return undefined
            }
          })

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

  private async buildTokenFilter(
    userAddress: string,
    adapter: IProtocolAdapter,
    filterProtocolTokensOverride?: string[],
  ) {
    if (adapter.chainId === Chain.Solana) {
      return undefined
    }

    try {
      // we use the overrides if provided
      if (
        filterProtocolTokensOverride &&
        filterProtocolTokensOverride.length > 0
      ) {
        return filterProtocolTokensOverride.map((t) => getAddress(t))
      }

      // env var override
      if (!this.parsedConfig.values.useGetAllTransferLogs) {
        return undefined
      }

      const transferLogs =
        await this.chainProvider.providers[
          adapter.chainId
        ].getAllTransferLogsToAddress(userAddress)

      // no logs on this chain means nothing done on this chain
      if (transferLogs.length === 0) {
        return []
      }

      // we cant use the logs for this adapter
      if (
        adapter.adapterSettings.userEvent !== 'Transfer' ||
        !adapter.adapterSettings.includeInUnwrap
      ) {
        return undefined
      }

      const uniqueAddresses = Array.from(
        new Set(transferLogs.map((log) => log.address)),
      )

      // we can build the filter
      const matchingProtocolTokenAddresses = await filterMapAsync(
        uniqueAddresses,
        async (address) => {
          const isAdapterToken =
            await this.adaptersController.isTokenBelongToAdapter(
              address,
              adapter.protocolId,
              adapter.productId,
              adapter.chainId,
            )
          if (isAdapterToken) {
            return address
          }

          return undefined
        },
      )
      return matchingProtocolTokenAddresses
    } catch (error) {
      // we cant use the logs on this chain
      if (error instanceof NotSupportedUnlimitedGetLogsBlockRange) {
        return undefined
      }

      logger.warn(
        {
          chainId: adapter.chainId,
          protocolId: adapter.protocolId,
          productId: adapter.productId,
          message: error instanceof Error ? error.message : undefined,
        },
        'Error building token filter for user address',
      )

      // we cant use the logs on this chain
      return undefined
    }
  }

  @ChecksumAddress
  async getProfits({
    userAddress,
    timePeriod = TimePeriod.sevenDays,
    filterProtocolIds,
    filterProductIds,
    filterChainIds,
    toBlockNumbersOverride,
    filterProtocolTokens,
    includeRawValues = false,
    filterTokenIds,
  }: {
    userAddress: string
    timePeriod?: TimePeriod
    filterProtocolIds?: Protocol[]
    filterProductIds?: string[]
    filterChainIds?: Chain[]
    toBlockNumbersOverride?: Partial<Record<Chain, number>>
    filterProtocolTokens?: string[]
    filterTokenIds?: string[]
    includeRawValues?: boolean
  }): Promise<DefiProfitsResponse[]> {
    this.initAdapterControllerForUnwrapStage()

    const runner = async (adapter: IProtocolAdapter) => {
      if (adapter.chainId === Chain.Solana) {
        throw new NotSupportedError('Profits not supported on Solana')
      }

      const provider = this.chainProvider.providers[adapter.chainId]

      const toBlock =
        toBlockNumbersOverride?.[adapter.chainId] ??
        (await provider.getStableBlockNumber())
      const fromBlock =
        toBlock - AVERAGE_BLOCKS_PER_DAY[adapter.chainId] * timePeriod

      const protocolTokenAddresses = await this.buildTokenFilter(
        userAddress,
        adapter,
        filterProtocolTokens,
      )

      // no transfers so we return
      if (protocolTokenAddresses && protocolTokenAddresses.length === 0) {
        return { tokens: [], fromBlock, toBlock }
      }

      const startTime = Date.now()

      const profits = await getProfits({
        adapter,
        userAddress,
        toBlock,
        fromBlock,
        protocolTokenAddresses,
        tokenIds: filterTokenIds,
        includeRawValues,
        unwrapCache: this.unwrapCache,
      })

      const endTime = Date.now()
      logger.info({
        source: 'adapter:profits',
        startTime,
        endTime,
        timeTaken: endTime - startTime,
        chainId: adapter.chainId,
        chainName: ChainIdToChainNameMap[adapter.chainId],
        protocolId: adapter.protocolId,
        productId: adapter.productId,
        timePeriod,
        userAddress,
        fromBlock,
        toBlock,
      })

      return profits
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

    logger.debug(count, 'getPProfits')
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

  @ChecksumAddress
  async getWithdrawals({
    userAddress,
    fromBlock,
    toBlock,
    protocolTokenAddress,
    protocolId,
    chainId,
    productId,
    tokenId,
  }: GetEventsRequestInput): Promise<DefiMovementsResponse> {
    let adapter: IProtocolAdapter
    try {
      adapter = this.adaptersController.fetchAdapter(
        chainId,
        protocolId,
        productId,
      )
    } catch (error) {
      return this.handleError(error)
    }

    const runner = async (adapter: IProtocolAdapter) => {
      if (adapter.chainId === Chain.Solana) {
        throw new NotSupportedError('Withdrawals not supported on Solana')
      }

      const positionsMovementsPromises = [
        adapter.getWithdrawals({
          protocolTokenAddress: getAddress(protocolTokenAddress),
          fromBlock,
          toBlock,
          userAddress,
          tokenId,
        }),
      ]

      if (typeof adapter.getRewardPositions === 'function') {
        positionsMovementsPromises.push(
          adapter.getRewardWithdrawals!({
            protocolTokenAddress: getAddress(protocolTokenAddress),
            fromBlock,
            toBlock,
            userAddress,
            tokenId,
          }),
        )
      }
      if (typeof adapter.getExtraRewardWithdrawals === 'function') {
        positionsMovementsPromises.push(
          adapter.getExtraRewardWithdrawals!({
            protocolTokenAddress: getAddress(protocolTokenAddress),
            fromBlock,
            toBlock,
            userAddress,
            tokenId,
          }),
        )
      }

      const positionsMovements = (
        await Promise.all(positionsMovementsPromises)
      ).flat()

      await Promise.all(
        positionsMovements.map(async (positionMovements) => {
          return await unwrap(
            adapter,
            positionMovements.blockNumber,
            positionMovements.tokens,
            'balanceRaw',
            this.unwrapCache,
          )
        }),
      )

      return {
        movements: positionsMovements.map((value) =>
          enrichMovements(value, chainId),
        ),
      }
    }

    return this.runTaskForAdapter(adapter, runner)
  }

  async getTransactionParams(input: GetTransactionParams): Promise<
    AdapterResponse<{
      params: { to: string; data: string }
    }>
  > {
    const { protocolId, chainId, productId } = input

    let adapter: IProtocolAdapter
    try {
      adapter = this.adaptersController.fetchAdapter(
        chainId,
        protocolId,
        productId,
      )
    } catch (error) {
      return this.handleError(error)
    }

    const runner = async (adapter: IProtocolAdapter) => {
      const txParams = await adapter.getTransactionParams!(input)

      return {
        params: txParams,
      }
    }

    return this.runTaskForAdapter(adapter, runner)
  }

  @ChecksumAddress
  async getDeposits({
    userAddress,
    fromBlock,
    toBlock,
    protocolTokenAddress,
    protocolId,
    chainId,
    productId,
    tokenId,
  }: GetEventsRequestInput): Promise<DefiMovementsResponse> {
    let adapter: IProtocolAdapter
    try {
      adapter = this.adaptersController.fetchAdapter(
        chainId,
        protocolId,
        productId,
      )
    } catch (error) {
      return this.handleError(error)
    }

    const runner = async (adapter: IProtocolAdapter) => {
      if (adapter.chainId === Chain.Solana) {
        throw new NotSupportedError('Deposits not supported on Solana')
      }

      const positionsMovements = await adapter.getDeposits({
        protocolTokenAddress: getAddress(protocolTokenAddress),
        fromBlock,
        toBlock,
        userAddress,
        tokenId,
      })

      await Promise.all(
        positionsMovements.map(async (positionMovements) => {
          return await unwrap(
            adapter,
            positionMovements.blockNumber,
            positionMovements.tokens,
            'balanceRaw',
            this.unwrapCache,
          )
        }),
      )

      return {
        movements: positionsMovements.map((value) =>
          enrichMovements(value, chainId),
        ),
      }
    }

    return this.runTaskForAdapter(adapter, runner)
  }

  @ChecksumAddress
  async getRepays({
    userAddress,
    fromBlock,
    toBlock,
    protocolTokenAddress,
    protocolId,
    chainId,
    productId,
    tokenId,
  }: GetEventsRequestInput): Promise<DefiMovementsResponse> {
    let adapter: IProtocolAdapter
    try {
      adapter = this.adaptersController.fetchAdapter(
        chainId,
        protocolId,
        productId,
      )
    } catch (error) {
      return this.handleError(error)
    }

    const runner = async (adapter: IProtocolAdapter) => {
      if (adapter.chainId === Chain.Solana) {
        throw new NotSupportedError('Repays not supported on Solana')
      }

      const positionsMovements =
        (await adapter.getRepays?.({
          protocolTokenAddress: getAddress(protocolTokenAddress),
          fromBlock,
          toBlock,
          userAddress,
          tokenId,
        })) || []

      await Promise.all(
        positionsMovements.map(async (positionMovements) => {
          return await unwrap(
            adapter,
            positionMovements.blockNumber,
            positionMovements.tokens,
            'balanceRaw',
            this.unwrapCache,
          )
        }),
      )

      return {
        movements: positionsMovements.map((value) =>
          enrichMovements(value, chainId),
        ),
      }
    }

    return this.runTaskForAdapter(adapter, runner)
  }

  @ChecksumAddress
  async getBorrows({
    userAddress,
    fromBlock,
    toBlock,
    protocolTokenAddress,
    protocolId,
    chainId,
    productId,
    tokenId,
  }: GetEventsRequestInput): Promise<DefiMovementsResponse> {
    let adapter: IProtocolAdapter
    try {
      adapter = this.adaptersController.fetchAdapter(
        chainId,
        protocolId,
        productId,
      )
    } catch (error) {
      return this.handleError(error)
    }

    const runner = async (adapter: IProtocolAdapter) => {
      if (adapter.chainId === Chain.Solana) {
        throw new NotSupportedError('Borrows not supported on Solana')
      }

      const positionsMovements =
        (await adapter.getBorrows?.({
          protocolTokenAddress: getAddress(protocolTokenAddress),
          fromBlock,
          toBlock,
          userAddress,
          tokenId,
        })) || []

      await Promise.all(
        positionsMovements.map(async (positionMovements) => {
          return await unwrap(
            adapter,
            positionMovements.blockNumber,
            positionMovements.tokens,
            'balanceRaw',
            this.unwrapCache,
          )
        }),
      )

      return {
        movements: positionsMovements?.map((value) =>
          enrichMovements(value, chainId),
        ),
      }
    }

    return this.runTaskForAdapter(adapter, runner)
  }

  @ChecksumAddress
  async getTotalValueLocked({
    filterProtocolIds,
    filterProductIds,
    filterChainIds,
    filterProtocolTokens,
    blockNumbers,
  }: {
    filterProtocolIds?: Protocol[]
    filterProductIds?: string[]
    filterChainIds?: Chain[]
    filterProtocolTokens?: string[]
    blockNumbers?: Partial<Record<Chain, number>>
  }): Promise<TotalValueLockResponse[]> {
    this.validateTvlInputs({
      filterProtocolIds,
      filterProductIds,
      filterChainIds,
      filterProtocolTokens,
    })

    const chainId = filterChainIds![0]!
    const protocolAddress = filterProtocolTokens![0]!
    const protocolId = filterProtocolIds![0]!
    const productId = filterProductIds![0]!

    const adapter = this.adaptersController.fetchAdapter(
      chainId,
      protocolId,
      productId,
    )

    if (!adapter) {
      throw new TvlValidationError(
        `No adapter found for protocol address: ${protocolAddress} on chain: ${chainId}`,
      )
    }

    if (adapter.protocolId !== protocolId || adapter.productId !== productId) {
      throw new TvlValidationError(
        `Protocol address ${protocolAddress} adapter does not match the provided protocolId: ${protocolId} and productId ${productId}`,
      )
    }

    const runner = async (adapter: IProtocolAdapter) => {
      const blockNumber = blockNumbers?.[adapter.chainId]

      const tokens = await adapter.getTotalValueLocked({
        protocolTokenAddresses: filterProtocolTokens?.map((t) => getAddress(t)),
        blockNumber,
      })

      if (tokens.length > 1) {
        throw new TvlValidationError(
          'Total value locked should return maximum one protocol token, adapter incorrectly implemented',
        )
      }

      await unwrap(
        adapter,
        blockNumber,
        tokens,
        'totalSupplyRaw',
        this.unwrapCache,
      )

      return {
        tokens: tokens.map((value) =>
          enrichTotalValueLocked(value, adapter.chainId),
        ),
      }
    }

    return [await this.runTaskForAdapter(adapter, runner)]
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

  private validateTvlInputs({
    filterProtocolIds,
    filterProductIds,
    filterChainIds,
    filterProtocolTokens,
  }: {
    filterProtocolIds?: Protocol[]
    filterProductIds?: string[]
    filterChainIds?: Chain[]
    filterProtocolTokens?: string[]
  }): void {
    if (!filterProtocolTokens || filterProtocolTokens.length !== 1) {
      throw new TvlValidationError(
        `One protocolToken must be provided for TVL, multiple tokens are not supported at this time. Params: ${[
          ...(filterProtocolIds ?? []),
          ...(filterProductIds ?? []),
          ...(filterChainIds ?? []),
          ...(filterProtocolTokens ?? []),
        ].join(', ')}`,
      )
    }

    if (!filterChainIds || filterChainIds.length !== 1) {
      throw new TvlValidationError(
        `One chainId must be provided for TVL, multiple chains are not supported at this time. Params: ${[
          ...(filterProtocolIds ?? []),
          ...(filterProductIds ?? []),
          ...(filterChainIds ?? []),
          ...(filterProtocolTokens ?? []),
        ].join(', ')}`,
      )
    }

    if (!filterProtocolIds || filterProtocolIds.length !== 1) {
      throw new TvlValidationError(
        `One protocolId must be provided for TVL, multiple protocols are not supported at this time. Params: ${[
          ...(filterProtocolIds ?? []),
          ...(filterProductIds ?? []),
          ...(filterChainIds ?? []),
          ...(filterProtocolTokens ?? []),
        ].join(', ')}`,
      )
    }

    if (!filterProductIds || filterProductIds.length !== 1) {
      throw new TvlValidationError(
        `One productId must be provided for TVL, multiple products are not supported at this time. Params: ${[
          ...(filterProtocolIds ?? []),
          ...(filterProductIds ?? []),
          ...(filterChainIds ?? []),
          ...(filterProtocolTokens ?? []),
        ].join(', ')}`,
      )
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
}
