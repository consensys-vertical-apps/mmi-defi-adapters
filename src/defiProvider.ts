import { getAddress } from 'ethers'
import { supportedProtocols } from './adapters'
import { Protocol } from './adapters/protocols'
import { Config, IConfig } from './config'
import { AdaptersController } from './core/adaptersController'
import { AVERAGE_BLOCKS_PER_DAY } from './core/constants/AVERAGE_BLOCKS_PER_DAY'
import { Chain, ChainName } from './core/constants/chains'
import { TimePeriod } from './core/constants/timePeriod'
import { ProviderMissingError } from './core/errors/errors'
import { getProfits } from './core/getProfits'
import { ChainProvider } from './core/provider/ChainProvider'
import { CustomJsonRpcProvider } from './core/provider/CustomJsonRpcProvider'
import { logger } from './core/utils/logger'
import {
  enrichPositionBalance,
  enrichUnderlyingTokenRates,
  enrichMovements,
  enrichTotalValueLocked,
} from './responseAdapters'
import { PositionType } from './types/adapter'
import { DeepPartial } from './types/deepPartial'
import { GetTransactionParamsInput } from './types/getTransactionParamsInput'
import { IProtocolAdapter } from './types/IProtocolAdapter'
import {
  APRResponse,
  APYResponse,
  AdapterResponse,
  DefiMovementsResponse,
  DefiPositionResponse,
  DefiProfitsResponse,
  AdapterErrorResponse,
  PricePerShareResponse,
  TotalValueLockResponse,
  GetEventsRequestInput,
} from './types/response'

export class DefiProvider {
  private parsedConfig
  chainProvider: ChainProvider
  adaptersController: AdaptersController
  private adaptersControllerWithoutPrices: AdaptersController

  constructor(config?: DeepPartial<IConfig>) {
    this.parsedConfig = new Config(config)
    this.chainProvider = new ChainProvider(this.parsedConfig.values)

    this.adaptersController = new AdaptersController({
      providers: this.chainProvider.providers,
      supportedProtocols,
    })

    const { [Protocol.PricesV2]: _, ...supportedProtocolsWithoutPrices } =
      supportedProtocols

    this.adaptersControllerWithoutPrices = new AdaptersController({
      providers: this.chainProvider.providers,
      supportedProtocols: supportedProtocolsWithoutPrices,
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

  async getPositions({
    userAddress,
    filterProtocolIds,
    filterChainIds,
    blockNumbers,
    filterProtocolTokens,
    filterTokenIds,
  }: {
    userAddress: string
    filterProtocolIds?: Protocol[]
    filterChainIds?: Chain[]
    blockNumbers?: Partial<Record<Chain, number>>
    filterProtocolTokens?: string[]
    filterTokenIds?: string[]
  }): Promise<DefiPositionResponse[]> {
    const runner = async (adapter: IProtocolAdapter) => {
      const blockNumber = blockNumbers?.[adapter.chainId]

      const startTime = Date.now()

      const protocolPositions = await adapter.getPositions({
        userAddress,
        blockNumber,
        protocolTokenAddresses: filterProtocolTokens?.map((t) => getAddress(t)),
        tokenIds: filterTokenIds,
      })

      const endTime = Date.now()
      logger.info({
        source: 'adapter:positions',
        startTime,
        endTime,
        timeTaken: endTime - startTime,
        chainId: adapter.chainId,
        chainName: ChainName[adapter.chainId],
        protocolId: adapter.protocolId,
        productId: adapter.productId,
        userAddress,
        blockNumber,
      })

      const tokens = protocolPositions.map((protocolPosition) =>
        enrichPositionBalance(protocolPosition, adapter.chainId),
      )

      return { tokens }
    }

    return this.runForAllProtocolsAndChains({
      runner,
      filterProtocolIds,
      filterChainIds,

      method: 'getPositions',
    })
  }

  async getProfits({
    userAddress,
    timePeriod = TimePeriod.sevenDays,
    filterProtocolIds,
    filterChainIds,
    toBlockNumbersOverride,
    filterProtocolTokens,
    includeRawValues = false,
    filterTokenIds,
  }: {
    userAddress: string
    timePeriod?: TimePeriod
    filterProtocolIds?: Protocol[]
    filterChainIds?: Chain[]
    toBlockNumbersOverride?: Partial<Record<Chain, number>>
    filterProtocolTokens?: string[]
    filterTokenIds?: string[]
    includeRawValues?: boolean
  }): Promise<DefiProfitsResponse[]> {
    const runner = async (
      adapter: IProtocolAdapter,
      provider: CustomJsonRpcProvider,
    ) => {
      const toBlock =
        toBlockNumbersOverride?.[adapter.chainId] ??
        (await provider.getStableBlockNumber())
      const fromBlock =
        toBlock - AVERAGE_BLOCKS_PER_DAY[adapter.chainId] * timePeriod

      const startTime = Date.now()

      const profits = await getProfits({
        adapter,
        userAddress,
        toBlock,
        fromBlock,
        protocolTokenAddresses: filterProtocolTokens?.map((t) => getAddress(t)),
        tokenIds: filterTokenIds,
        includeRawValues,
      })

      const endTime = Date.now()
      logger.info({
        source: 'adapter:profits',
        startTime,
        endTime,
        timeTaken: endTime - startTime,
        chainId: adapter.chainId,
        chainName: ChainName[adapter.chainId],
        protocolId: adapter.protocolId,
        productId: adapter.productId,
        timePeriod,
        userAddress,
        fromBlock,
        toBlock,
      })

      return profits
    }

    return this.runForAllProtocolsAndChains({
      runner,
      filterProtocolIds,
      filterChainIds,
      method: 'getProfits',
    })
  }

  async getPrices({
    filterProtocolIds,
    filterChainIds,
    filterProtocolToken,
    blockNumbers,
  }: {
    filterProtocolIds?: Protocol[]
    filterChainIds?: Chain[]
    filterProtocolToken?: string
    blockNumbers?: Partial<Record<Chain, number>>
  }): Promise<PricePerShareResponse[]> {
    const runner = async (adapter: IProtocolAdapter) => {
      const blockNumber = blockNumbers?.[adapter.chainId]

      let protocolTokens = []
      if (!filterProtocolToken) {
        protocolTokens = await adapter.getProtocolTokens()
      } else {
        protocolTokens = [
          {
            address: filterProtocolToken,
          },
        ]
      }

      const tokens = await Promise.all(
        protocolTokens.map(async ({ address }) => {
          const startTime = Date.now()

          const protocolTokenUnderlyingRate =
            await adapter.getProtocolTokenToUnderlyingTokenRate({
              protocolTokenAddress: getAddress(address),
              blockNumber,
            })

          const endTime = Date.now()
          logger.info({
            source: 'adapter:prices',
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

          return enrichUnderlyingTokenRates(
            protocolTokenUnderlyingRate,
            adapter.chainId,
          )
        }),
      )

      return { tokens }
    }

    return this.runForAllProtocolsAndChains({
      runner,
      filterProtocolIds,
      filterChainIds,

      method: 'getPrices',
    })
  }

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
    const provider = this.chainProvider.providers[chainId]

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
      const positionMovements = await adapter.getWithdrawals({
        protocolTokenAddress: getAddress(protocolTokenAddress),
        fromBlock,
        toBlock,
        userAddress,
        tokenId,
      })

      return {
        movements: positionMovements.map((value) =>
          enrichMovements(value, chainId),
        ),
      }
    }

    return this.runTaskForAdapter(adapter, provider!, runner)
  }

  async getTransactionParams(
    input: GetTransactionParamsInput & { chainId: Chain },
  ): Promise<
    AdapterResponse<{
      params: { to: string; data: string }
    }>
  > {
    const { protocolId, chainId, productId } = input

    const provider = this.chainProvider.providers[chainId]
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

    return this.runTaskForAdapter(adapter, provider!, runner)
  }

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
    const provider = this.chainProvider.providers[chainId]

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
      const positionMovements = await adapter.getDeposits({
        protocolTokenAddress: getAddress(protocolTokenAddress),
        fromBlock,
        toBlock,
        userAddress,
        tokenId,
      })

      return {
        movements: positionMovements.map((value) =>
          enrichMovements(value, chainId),
        ),
      }
    }

    return this.runTaskForAdapter(adapter, provider!, runner)
  }
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
    const provider = this.chainProvider.providers[chainId]

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
      const positionMovements = await adapter.getRepays?.({
        protocolTokenAddress: getAddress(protocolTokenAddress),
        fromBlock,
        toBlock,
        userAddress,
        tokenId,
      })

      return {
        movements:
          positionMovements?.map((value) => enrichMovements(value, chainId)) ||
          [],
      }
    }

    return this.runTaskForAdapter(adapter, provider!, runner)
  }
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
    const provider = this.chainProvider.providers[chainId]

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
      const positionMovements = await adapter.getBorrows?.({
        protocolTokenAddress: getAddress(protocolTokenAddress),
        fromBlock,
        toBlock,
        userAddress,
        tokenId,
      })

      return {
        movements:
          positionMovements?.map((value) => enrichMovements(value, chainId)) ||
          [],
      }
    }

    return this.runTaskForAdapter(adapter, provider!, runner)
  }

  async getTotalValueLocked({
    filterProtocolIds,
    filterChainIds,
    blockNumbers,
  }: {
    filterProtocolIds?: Protocol[]
    filterChainIds?: Chain[]
    blockNumbers?: Partial<Record<Chain, number>>
  }): Promise<TotalValueLockResponse[]> {
    const runner = async (adapter: IProtocolAdapter) => {
      const blockNumber = blockNumbers?.[adapter.chainId]

      const tokens = await adapter.getTotalValueLocked({ blockNumber })

      return {
        tokens: tokens.map((value) =>
          enrichTotalValueLocked(value, adapter.chainId),
        ),
      }
    }

    return this.runForAllProtocolsAndChains({
      runner,
      filterProtocolIds,
      filterChainIds,
      method: 'getTotalValueLocked',
    })
  }

  async getApy({
    filterProtocolIds,
    filterChainIds,
    blockNumbers,
  }: {
    filterProtocolIds?: Protocol[]
    filterChainIds?: Chain[]
    blockNumbers?: Partial<Record<Chain, number>>
  }): Promise<APYResponse[]> {
    const runner = async (adapter: IProtocolAdapter) => {
      const blockNumber = blockNumbers?.[adapter.chainId]

      const protocolTokens = await adapter.getProtocolTokens()
      const tokens = await Promise.all(
        protocolTokens.map(({ address }) =>
          adapter.getApy({
            protocolTokenAddress: getAddress(address),
            blockNumber,
          }),
        ),
      )

      return {
        tokens: tokens.filter((obj) => !(obj && Object.keys(obj).length === 0)),
      }
    }

    return this.runForAllProtocolsAndChains({
      runner,
      filterProtocolIds,
      filterChainIds,
      method: 'getApy',
    })
  }

  async getApr({
    filterProtocolIds,
    filterChainIds,
    blockNumbers,
  }: {
    filterProtocolIds?: Protocol[]
    filterChainIds?: Chain[]
    blockNumbers?: Partial<Record<Chain, number>>
  }): Promise<APRResponse[]> {
    const runner = async (adapter: IProtocolAdapter) => {
      const blockNumber = blockNumbers?.[adapter.chainId]

      const protocolTokens = await adapter.getProtocolTokens()
      const tokens = await Promise.all(
        protocolTokens.map(({ address }) =>
          adapter.getApr({
            protocolTokenAddress: getAddress(address),
            blockNumber,
          }),
        ),
      )

      return {
        tokens: tokens.filter((obj) => !(obj && Object.keys(obj).length === 0)),
      }
    }

    return this.runForAllProtocolsAndChains({
      runner,
      filterProtocolIds,
      filterChainIds,
      method: 'getApr',
    })
  }

  getSupport(input: {
    filterProtocolIds: Protocol[] | undefined
    filterChainIds: Chain[] | undefined
    version: string
  }) {
    if (input.version === '3') {
      return this.adaptersController.getSupport3(input)
    } else if (input.version === '2') {
      return this.adaptersController.getSupport2(input)
    } else {
      return this.adaptersController.getSupport(input)
    }
  }

  private async runForAllProtocolsAndChains<ReturnType extends object>({
    runner,
    filterProtocolIds,
    filterChainIds,
    method,
  }: {
    runner: (
      adapter: IProtocolAdapter,
      provider: CustomJsonRpcProvider,
    ) => ReturnType
    filterProtocolIds?: Protocol[]
    filterChainIds?: Chain[]
    method:
      | 'getPositions'
      | 'getPrices'
      | 'getProfits'
      | 'getWithdrawals'
      | 'getDeposits'
      | 'getTotalValueLocked'
      | 'getApy'
      | 'getApr'
  }): Promise<AdapterResponse<Awaited<ReturnType>>[]> {
    const protocolPromises = Object.entries(supportedProtocols)
      .filter(
        ([protocolIdKey, _]) =>
          (!filterProtocolIds ||
            filterProtocolIds.includes(protocolIdKey as Protocol)) &&
          (method === 'getPrices' || protocolIdKey !== Protocol.PricesV2),
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
            const provider = this.chainProvider.providers[chainId]!

            let chainProtocolAdapters =
              this.adaptersController.fetchChainProtocolAdapters(
                chainId,
                protocolId,
              )

            if (
              method == 'getPositions' &&
              !this.parsedConfig.values.enableUsdPricesOnPositions
            ) {
              chainProtocolAdapters =
                this.adaptersControllerWithoutPrices.fetchChainProtocolAdapters(
                  chainId,
                  protocolId,
                )
            }

            return Array.from(chainProtocolAdapters)
              .filter(
                ([_, adapter]) =>
                  adapter.getProtocolDetails().positionType !==
                  PositionType.Reward,
              )
              .map(([_, adapter]) =>
                this.runTaskForAdapter(adapter, provider, runner),
              )
          })
      })

    const result = await Promise.all(protocolPromises)

    return result
  }

  private async runTaskForAdapter<ReturnType>(
    adapter: IProtocolAdapter,
    provider: CustomJsonRpcProvider,
    runner: (
      adapter: IProtocolAdapter,
      provider: CustomJsonRpcProvider,
    ) => ReturnType,
  ): Promise<AdapterResponse<Awaited<ReturnType>>> {
    const protocolDetails = adapter.getProtocolDetails()

    try {
      if (!provider) {
        throw new ProviderMissingError(adapter.chainId)
      }

      const adapterResult = await runner(adapter, provider)
      return {
        ...protocolDetails,
        success: true,
        ...adapterResult,
      }
    } catch (error) {
      return {
        ...protocolDetails,
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
}
