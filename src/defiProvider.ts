import { supportedProtocols } from './adapters'
import { Protocol } from './adapters/protocols'
import { Config, IConfig } from './config'
import { AVERAGE_BLOCKS_PER_DAY } from './core/constants/AVERAGE_BLOCKS_PER_DAY'
import { Chain, ChainName } from './core/constants/chains'
import { TimePeriod } from './core/constants/timePeriod'
import { ProviderMissingError } from './core/errors/errors'
import { ChainProvider } from './core/utils/chainProviders'
import { CustomJsonRpcProvider } from './core/utils/customJsonRpcProvider'
import {
  enrichPositionBalance,
  enrichProfitsWithRange,
  enrichUnderlyingTokenRates,
  enrichMovements,
  enrichTotalValueLocked,
} from './responseAdapters'
import { PositionType } from './types/adapter'
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

export {
  Chain,
  DefiPositionResponse,
  DefiProfitsResponse,
  PositionType,
  Protocol,
  TimePeriod,
}
export class DefiProvider {
  chainProvider: ChainProvider

  constructor(config?: IConfig) {
    const parsedConfig = new Config(config)
    this.chainProvider = new ChainProvider(parsedConfig.values)
  }

  async getPositions({
    userAddress,
    filterProtocolIds,
    filterChainIds,
    blockNumbers,
  }: {
    userAddress: string
    filterProtocolIds?: Protocol[]
    filterChainIds?: Chain[]
    blockNumbers?: Partial<Record<Chain, number>>
  }): Promise<DefiPositionResponse[]> {
    const runner = async (adapter: IProtocolAdapter) => {
      const blockNumber = blockNumbers?.[adapter.chainId]

      const protocolPositions = await adapter.getPositions({
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
    })
  }

  async getProfits({
    userAddress,
    timePeriod = TimePeriod.sevenDays,
    filterProtocolIds,
    filterChainIds,
    toBlockNumbersOverride,
  }: {
    userAddress: string
    timePeriod?: TimePeriod
    filterProtocolIds?: Protocol[]
    filterChainIds?: Chain[]
    toBlockNumbersOverride?: Partial<Record<Chain, number>>
  }): Promise<DefiProfitsResponse[]> {
    const runner = async (
      adapter: IProtocolAdapter,
      provider: CustomJsonRpcProvider,
    ) => {
      const toBlock =
        toBlockNumbersOverride?.[adapter.chainId] ??
        (await provider.getBlockNumber())
      const fromBlock =
        toBlock - AVERAGE_BLOCKS_PER_DAY[adapter.chainId] * timePeriod
      const profits = await adapter.getProfits({
        userAddress,
        toBlock,
        fromBlock,
      })

      return enrichProfitsWithRange(profits, adapter.chainId)
    }

    return this.runForAllProtocolsAndChains({
      runner,
      filterProtocolIds,
      filterChainIds,
    })
  }

  async getPrices({
    filterProtocolIds,
    filterChainIds,
    blockNumbers,
  }: {
    filterProtocolIds?: Protocol[]
    filterChainIds?: Chain[]
    blockNumbers?: Partial<Record<Chain, number>>
  }): Promise<PricePerShareResponse[]> {
    const runner = async (adapter: IProtocolAdapter) => {
      const blockNumber = blockNumbers?.[adapter.chainId]

      const protocolTokens = await adapter.getProtocolTokens()
      const tokens = await Promise.all(
        protocolTokens.map(async ({ address: protocolTokenAddress }) => {
          const protocolTokenUnderlyingRate =
            await adapter.getProtocolTokenToUnderlyingTokenRate({
              protocolTokenAddress,
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
    })
  }

  async getWithdrawals({
    userAddress,
    fromBlock,
    toBlock,
    protocolTokenAddress,
    protocolId,
    chainId,
    product,
    tokenId,
  }: GetEventsRequestInput): Promise<DefiMovementsResponse> {
    const provider = this.chainProvider.providers[chainId]

    const adapterClass = supportedProtocols?.[protocolId]?.[chainId]?.find(
      (adapter) =>
        new adapter({
          provider: provider!,
          chainId,
          protocolId,
        }).getProtocolDetails().product == product,
    )

    if (!adapterClass) {
      return {
        success: false,
        error: {
          message: 'No adapter found',
          details: {
            product,
            protocolId,
            chainId: chainId,
            chainName: ChainName[chainId],
          },
        },
      }
    }

    const runner = async (adapter: IProtocolAdapter) => {
      const positionMovements = await adapter.getWithdrawals({
        protocolTokenAddress,
        fromBlock,
        toBlock,
        userAddress,
        tokenId,
      })

      return {
        movements: positionMovements.map((value) => enrichMovements(value)),
      }
    }

    const adapter = new adapterClass({
      provider: provider!,
      chainId,
      protocolId,
    })
    return this.runTaskForAdapter(adapter, provider!, runner)
  }

  async getDeposits({
    userAddress,
    fromBlock,
    toBlock,
    protocolTokenAddress,
    protocolId,
    chainId,
    product,
    tokenId,
  }: GetEventsRequestInput): Promise<DefiMovementsResponse> {
    const provider = this.chainProvider.providers[chainId]

    const adapterClass = supportedProtocols?.[protocolId]?.[chainId]?.find(
      (adapter) =>
        new adapter({
          provider: provider!,
          chainId,
          protocolId,
        }).getProtocolDetails().product == product,
    )

    if (!adapterClass) {
      return {
        success: false,
        error: {
          message: 'No adapter found',
          details: {
            product,
            protocolId,
            chainId: chainId,
            chainName: ChainName[chainId],
          },
        },
      }
    }

    const runner = async (adapter: IProtocolAdapter) => {
      const positionMovements = await adapter.getDeposits({
        protocolTokenAddress,
        fromBlock,
        toBlock,
        userAddress,
        tokenId,
      })

      return {
        movements: positionMovements.map((value) => enrichMovements(value)),
      }
    }

    const adapter = new adapterClass({
      provider: this.chainProvider.providers[chainId]!,
      chainId,
      protocolId,
    })
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
        protocolTokens.map(({ address: protocolTokenAddress }) =>
          adapter.getApy({ protocolTokenAddress, blockNumber }),
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
        protocolTokens.map(({ address: protocolTokenAddress }) =>
          adapter.getApr({ protocolTokenAddress, blockNumber }),
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
    })
  }

  async getLatestBlock(chainId: Chain): Promise<number> {
    const provider = this.chainProvider.providers[chainId]

    if (!provider) {
      throw new ProviderMissingError(chainId)
    }

    return provider.getBlockNumber()
  }

  private async runForAllProtocolsAndChains<ReturnType extends object>({
    runner,
    filterProtocolIds,
    filterChainIds,
  }: {
    runner: (
      adapter: IProtocolAdapter,
      provider: CustomJsonRpcProvider,
    ) => ReturnType
    filterProtocolIds?: Protocol[]
    filterChainIds?: Chain[]
  }): Promise<AdapterResponse<Awaited<ReturnType>>[]> {
    const protocolPromises = Object.entries(supportedProtocols)
      .filter(
        ([protocolIdKey, _]) =>
          !filterProtocolIds ||
          filterProtocolIds.includes(protocolIdKey as Protocol),
      )
      .flatMap(([protocolIdKey, supportedChains]) => {
        // Object.entries casts the numeric key as a string. This reverses it
        return Object.entries(supportedChains)
          .filter(([chainIdKey, _]) => {
            return (
              !filterChainIds || filterChainIds.includes(+chainIdKey as Chain)
            )
          })
          .flatMap(([chainIdKey, adapterClasses]) => {
            const chainId = +chainIdKey as Chain
            const provider = this.chainProvider.providers[chainId]!

            return adapterClasses.map(
              async (
                adapterClass,
              ): Promise<AdapterResponse<Awaited<ReturnType>>> => {
                const adapter = new adapterClass({
                  provider: provider!,
                  chainId,
                  protocolId: protocolIdKey as Protocol,
                })

                return this.runTaskForAdapter(adapter, provider, runner)
              },
            )
          })
      })

    return Promise.all(protocolPromises)
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
        ...protocolDetails,
        success: false,
        error: adapterError,
      }
    }
  }
}
