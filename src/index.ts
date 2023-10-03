import { ethers, formatUnits } from 'ethers'
import { supportedProtocols } from './adapters'
import { Protocol } from './adapters/protocols'
import { AVERAGE_BLOCKS_PER_DAY } from './core/constants/AVERAGE_BLOCKS_PER_DAY'
import { Chain, ChainName } from './core/constants/chains'
import { TimePeriod } from './core/constants/timePeriod'
import { chainProviders } from './core/utils/chainProviders'
import {
  PositionProfits,
  PositionType,
  ProtocolTokenUnderlyingRate,
  TokenBalance,
  Underlying,
  UnderlyingTokenRate,
} from './types/adapter'
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
  AddPositionsBalance,
  AddProfitsBalance,
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

    const protocolPositions = await adapter.getPositions({
      userAddress,
      blockNumber,
    })

    const tokens = protocolPositions.map((protocolPosition) =>
      enrichPositionsResponse(protocolPosition),
    )

    return { tokens }
  }

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolIds,
    filterChainIds,
  })
}

function enrichPositionsResponse<
  T extends TokenBalance & { tokens?: Underlying[] },
>(balance: T): AddPositionsBalance<T> {
  return {
    ...balance,
    balance: formatUnits(balance.balanceRaw, balance.decimals),
    ...(balance.tokens
      ? {
          tokens: balance.tokens?.map((underlyingBalance) =>
            enrichPositionsResponse(underlyingBalance),
          ),
        }
      : {}),
  } as AddPositionsBalance<T>
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
    const profits = await adapter.getProfits({
      userAddress,
      toBlock,
      fromBlock,
    })

    return enrichProfitsResponse(profits)
  }

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolIds,
    filterChainIds,
  })
}

function enrichProfitsResponse<T extends { tokens?: PositionProfits[] }>(
  profit: T,
): AddProfitsBalance<T> {
  return {
    ...profit,
    ...(profit.tokens
      ? {
          tokens: profit.tokens?.map((positionProfit) => {
            return {
              ...positionProfit,
              tokens: positionProfit.tokens.map((underlyingProfitValue) => {
                return {
                  ...underlyingProfitValue,
                  profit: formatUnits(
                    underlyingProfitValue.profitRaw,
                    underlyingProfitValue.decimals,
                  ),
                }
              }),
            }
          }),
        }
      : {}),
  } as AddProfitsBalance<T>
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
      protocolTokens.map(({ address: protocolTokenAddress }) => {
        const temp = adapter.getProtocolTokenToUnderlyingTokenRate({
          protocolTokenAddress,
          blockNumber,
        })
        return temp
      }),
    )

    return { tokens }
  }

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolIds,
    filterChainIds,
  })
}

function enrichPricesResponse<
  T extends { tokens?: ProtocolTokenUnderlyingRate[] },
>(pricePerShare: T): AddProfitsBalance<T> {
  return {
    ...pricePerShare,
    ...(pricePerShare.tokens
      ? {
          tokens: pricePerShare.tokens?.map((protocolTokenUnderlyingRate) => {
            return {
              ...protocolTokenUnderlyingRate,
              tokens: protocolTokenUnderlyingRate.tokens?.map(
                (underlyingTokenRate) => {
                  return {
                    ...underlyingTokenRate,
                    underlyingRate: formatUnits(
                      underlyingTokenRate.underlyingRateRaw,
                      underlyingTokenRate.decimals,
                    ),
                  }
                },
              ),
            }
          }),
        }
      : {}),
  } as AddProfitsBalance<T>
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
