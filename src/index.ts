import { ethers } from 'ethers'
import { Protocol, supportedProtocols } from './adapters'
import { AVERAGE_BLOCKS_PER_DAY } from './core/constants/AVERAGE_BLOCKS_PER_DAY'
import { Chain, ChainName } from './core/constants/chains'
import { TimePeriod } from './core/constants/timePeriod'
import { chainProviders } from './core/utils/chainProviders'
import { IProtocolAdapter, PositionType } from './types/adapter'
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
} from './types/response'

export {
  Chain,
  DefiPositionResponse,
  DefiProfitsResponse,
  PositionType,
  Protocol,
  TimePeriod,
}

export async function getPositions({
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

    const tokens = await adapter.getPositions({
      userAddress,
      blockNumber,
    })

    return { tokens }
  }

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolIds,
    filterChainIds,
  })
}

export async function getProfits({
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
    provider: ethers.JsonRpcProvider,
  ) => {
    const toBlock =
      toBlockNumbersOverride?.[adapter.chainId] ??
      (await provider.getBlockNumber())
    const fromBlock =
      toBlock - AVERAGE_BLOCKS_PER_DAY[adapter.chainId] * timePeriod
    return adapter.getProfits({
      userAddress,
      toBlock,
      fromBlock,
    })
  }

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolIds,
    filterChainIds,
  })
}

export async function getPrices({
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
      protocolTokens.map(({ address: protocolTokenAddress }) =>
        adapter.getPricePerShare({ protocolTokenAddress, blockNumber }),
      ),
    )

    return { tokens }
  }

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolIds,
    filterChainIds,
  })
}

export async function getWithdrawals({
  filterProtocolIds,
  filterChainIds,
  userAddress,
  fromBlock,
  toBlock,
}: {
  filterProtocolIds?: Protocol[]
  filterChainIds?: Chain[]
  userAddress: string
  fromBlock: number
  toBlock: number
}): Promise<DefiMovementsResponse[]> {
  const runner = async (adapter: IProtocolAdapter) => {
    const protocolTokens = await adapter.getProtocolTokens()
    const movements = await Promise.all(
      protocolTokens.map(async (protocolToken) => {
        const positionMovements = await adapter.getWithdrawals({
          protocolTokenAddress: protocolToken.address,
          fromBlock,
          toBlock,
          userAddress,
        })

        return {
          protocolToken,
          positionMovements,
        }
      }),
    )

    return {
      movements,
    }
  }

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolIds,
    filterChainIds,
  })
}

export async function getDeposits({
  filterProtocolIds,
  filterChainIds,
  userAddress,
  fromBlock,
  toBlock,
}: {
  filterProtocolIds?: Protocol[]
  filterChainIds?: Chain[]
  userAddress: string
  fromBlock: number
  toBlock: number
}): Promise<DefiMovementsResponse[]> {
  const runner = async (adapter: IProtocolAdapter) => {
    const protocolTokens = await adapter.getProtocolTokens()
    const movements = await Promise.all(
      protocolTokens.map(async (protocolToken) => {
        const positionMovements = await adapter.getDeposits({
          protocolTokenAddress: protocolToken.address,
          fromBlock,
          toBlock,
          userAddress,
        })

        return {
          protocolToken,
          positionMovements,
        }
      }),
    )

    return {
      movements,
    }
  }

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolIds,
    filterChainIds,
  })
}

export async function getTotalValueLocked({
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

    return { tokens }
  }

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolIds,
    filterChainIds,
  })
}

export async function getApy({
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

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolIds,
    filterChainIds,
  })
}

export async function getApr({
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

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolIds,
    filterChainIds,
  })
}

async function runForAllProtocolsAndChains<ReturnType extends object>({
  runner,
  filterProtocolIds,
  filterChainIds,
}: {
  runner: (
    adapter: IProtocolAdapter,
    provider: ethers.JsonRpcProvider,
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
          const provider = chainProviders[chainId]

          return adapterClasses.map(
            async (
              adapterClass,
            ): Promise<AdapterResponse<Awaited<ReturnType>>> => {
              const adapter = new adapterClass({
                provider: provider!,
                chainId,
                protocolId: protocolIdKey as Protocol,
              })

              const protocolDetails = adapter.getProtocolDetails()

              if (!provider) {
                return {
                  ...protocolDetails,
                  success: false,
                  error: {
                    message: 'No provider found for chain',
                    details: {
                      chainId,
                      chainName: ChainName[chainId],
                    },
                  },
                }
              }

              try {
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
            },
          )
        })
    })

  return Promise.all(protocolPromises)
}
