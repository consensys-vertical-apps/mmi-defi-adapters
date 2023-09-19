import { ethers } from 'ethers'
import { Protocol, supportedProtocols } from './adapters'
import { Chain, ChainName } from './core/constants/chains'
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
import { AVERAGE_BLOCKS_PER_DAY } from './core/constants/AVERAGE_BLOCKS_PER_DAY'
import { TimePeriod } from './core/constants/TimePeriod'

export {
  APRResponse,
  APYResponse,
  DefiMovementsResponse,
  DefiPositionResponse,
  DefiProfitsResponse,
  PricePerShareResponse,
  TotalValueLockResponse,
  Chain,
  chainProviders,
  Protocol,
  supportedProtocols,
  PositionType,
  AVERAGE_BLOCKS_PER_DAY,
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
  blockNumbers?: Record<string, number | undefined>
}): Promise<DefiPositionResponse[]> {
  const runner = async (adapter: IProtocolAdapter) => {
    const chainId = adapter.getProtocolDetails().chainId

    const blockNumber = blockNumbers?.[chainId]

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
  filterProtocolIds,
  filterChainIds,
  toBlockNumbersOverride: filterToBlockNumbers,
  filterTimePeriod = TimePeriod.sevenDays,
}: {
  userAddress: string
  filterTimePeriod?: TimePeriod
  filterProtocolIds?: Protocol[]
  filterChainIds?: Chain[]
  toBlockNumbersOverride?: Record<Chain, number | undefined>
}): Promise<DefiProfitsResponse[]> {
  const runner = async (
    adapter: IProtocolAdapter,
    provider: ethers.JsonRpcProvider,
  ) => {
    const chainId = adapter.getProtocolDetails().chainId

    const toBlock =
      filterToBlockNumbers?.[chainId] || (await provider.getBlockNumber())
    const fromBlock =
      toBlock - AVERAGE_BLOCKS_PER_DAY[chainId] * filterTimePeriod
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

    return { tokens }
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

          return adapterClasses.map(async (adapterClass) => {
            const adapter = new adapterClass({
              provider: provider!,
              chainId,
              protocolId: protocolIdKey as Protocol,
            })

            const protocolDetails = adapter.getProtocolDetails()

            if (!provider) {
              return {
                ...protocolDetails,
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
                ...protocolDetails,
                error: adapterError,
              }
            }
          })
        })
    })

  return Promise.all(protocolPromises)
}
