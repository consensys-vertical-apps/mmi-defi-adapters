import { ethers } from 'ethers'
import { Protocol, supportedProtocols } from './adapters'
import { Chain } from './core/constants/chains'
import { chainProviders } from './core/utils/chainProviders'
import { fulfilledPromises } from './core/utils/filters'
import { logger } from './core/utils/logger'
import { IProtocolAdapter } from './types/adapter'
import {
  APRResponse,
  APYResponse,
  AdapterResponse,
  DefiMovementsResponse,
  DefiPositionResponse,
  DefiPositions,
  DefiProfitsResponse,
  AdapterError,
  PricePerShareResponse,
  TotalValueLockResponse,
} from './types/response'

export async function getPositions({
  userAddress,
  filterProtocolIds,
  filterChainIds,
}: {
  userAddress: string
  filterProtocolIds?: Protocol[]
  filterChainIds?: Chain[]
}): Promise<DefiPositionResponse[]> {
  const runner = async (adapter: IProtocolAdapter): Promise<DefiPositions> => {
    return {
      tokens: await adapter.getPositions({
        userAddress,
      }),
    }
  }

  return runForAllProtocolsAndChains2({
    runner,
    filterProtocolIds,
    filterChainIds,
  })
}

export async function getTodaysProfits({
  userAddress,
  filterProtocolIds,
  filterChainIds,
}: {
  userAddress: string
  filterProtocolIds?: Protocol[]
  filterChainIds?: Chain[]
}): Promise<DefiProfitsResponse[]> {
  const runner = async (
    adapter: IProtocolAdapter,
    provider: ethers.JsonRpcProvider,
  ) => {
    const blockNumber = await provider.getBlockNumber()
    const profits = await adapter.getOneDayProfit({
      userAddress,
      blockNumber,
    })
    return { ...adapter.getProtocolDetails(), ...profits }
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
}: {
  filterProtocolIds?: Protocol[]
  filterChainIds?: Chain[]
}): Promise<PricePerShareResponse[]> {
  const runner = async (adapter: IProtocolAdapter) => {
    const protocolTokens = await adapter.getProtocolTokens()
    const tokens = await Promise.all(
      protocolTokens.map(({ address: protocolTokenAddress }) =>
        adapter.getPricePerShare({ protocolTokenAddress }),
      ),
    )

    return { ...adapter.getProtocolDetails(), tokens }
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
}: {
  filterProtocolIds?: Protocol[]
  filterChainIds?: Chain[]
}): Promise<TotalValueLockResponse[]> {
  const runner = async (adapter: IProtocolAdapter) => {
    const tokens = await adapter.getTotalValueLocked({})
    return { ...adapter.getProtocolDetails(), tokens }
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
}: {
  filterProtocolIds?: Protocol[]
  filterChainIds?: Chain[]
}): Promise<APYResponse[]> {
  const runner = async (adapter: IProtocolAdapter) => {
    const protocolTokens = await adapter.getProtocolTokens()
    const tokens = await Promise.all(
      protocolTokens.map(({ address: protocolTokenAddress }) =>
        adapter.getApy({ protocolTokenAddress }),
      ),
    )

    return {
      ...adapter.getProtocolDetails(),
      tokens: tokens.filter((obj) => !(obj && Object.keys(obj).length === 0)),
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
      ...adapter.getProtocolDetails(),
      movements,
    }
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
      ...adapter.getProtocolDetails(),
      movements,
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
}: {
  filterProtocolIds?: Protocol[]
  filterChainIds?: Chain[]
}): Promise<APRResponse[]> {
  const runner = async (adapter: IProtocolAdapter) => {
    const protocolTokens = await adapter.getProtocolTokens()
    const tokens = await Promise.all(
      protocolTokens.map(({ address: protocolTokenAddress }) =>
        adapter.getApr({ protocolTokenAddress }),
      ),
    )

    return {
      ...adapter.getProtocolDetails(),
      tokens: tokens.filter((obj) => !(obj && Object.keys(obj).length === 0)),
    }
  }

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolIds,
    filterChainIds,
  })
}

async function runForAllProtocolsAndChains2<ReturnType extends object>({
  runner,
  filterProtocolIds,
  filterChainIds,
}: {
  runner: (
    adapter: IProtocolAdapter,
    provider: ethers.providers.StaticJsonRpcProvider,
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

          if (!provider) {
            logger.error({ chainId }, 'No provider found for chain')
            throw new Error(`No provider found for chain: ${chainId}`)
          }

          return adapterClasses.map(async (adapterClass) => {
            const adapter = new adapterClass({
              provider,
              chainId,
              protocolId: protocolIdKey as Protocol,
            })

            try {
              const adapterResult = await runner(adapter, provider)
              return {
                ...adapter.getProtocolDetails(),
                ...adapterResult,
              }
            } catch (error) {
              let adapterError: AdapterError['error']

              if (error instanceof Error) {
                adapterError = {
                  message: error.message,
                  details: { name: error.name },
                }
              } else if (typeof error === 'string') {
                adapterError = {
                  message: error,
                }
              } else if (error && typeof error.toString === 'function') {
                adapterError = {
                  message: error.toString(),
                }
              } else {
                adapterError = {
                  message: 'Error message cannot be extracted',
                }
              }

              return {
                ...adapter.getProtocolDetails(),
                error: adapterError,
              }
            }
          })
        })
    })

  const results = await Promise.all(protocolPromises)

  return results
}

async function runForAllProtocolsAndChains<ReturnType>({
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
}) {
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

          if (!provider) {
            logger.error({ chainId }, 'No provider found for chain')
            throw new Error(`No provider found for chain: ${chainId}`)
          }

          return adapterClasses.map(async (adapterClass) => {
            return await runner(
              new adapterClass({
                provider,
                chainId,
                protocolId: protocolIdKey as Protocol,
              }),
              provider,
            )
          })
        })
    })

  const protocolResults = await Promise.allSettled(protocolPromises)

  return fulfilledPromises(protocolResults)
}
