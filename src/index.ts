import { ethers } from 'ethers'
import { supportedProtocols } from './adapters'
import { Protocol } from './adapters/protocols'
import { AdaptersController } from './core/adaptersController'
import { AVERAGE_BLOCKS_PER_DAY } from './core/constants/AVERAGE_BLOCKS_PER_DAY'
import { Chain } from './core/constants/chains'
import { TimePeriod } from './core/constants/timePeriod'
import { ProviderMissingError } from './core/errors/errors'
import { chainProviders } from './core/utils/chainProviders'
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

const adaptersController = new AdaptersController()

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
      enrichPositionBalance(protocolPosition, adapter.chainId),
    )

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
    const profits = await adapter.getProfits({
      userAddress,
      toBlock,
      fromBlock,
    })

    return enrichProfitsWithRange(profits, adapter.chainId)
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

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolIds,
    filterChainIds,
  })
}

export async function getWithdrawals({
  userAddress,
  fromBlock,
  toBlock,
  protocolTokenAddress,
  tokenId,
  protocolId,
  chainId,
  productId,
}: GetEventsRequestInput): Promise<DefiMovementsResponse> {
  const provider = chainProviders[chainId]

  let adapter: IProtocolAdapter
  try {
    adapter = adaptersController.fetchAdapter(chainId, protocolId, productId)
  } catch (error) {
    return handleError(error)
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

  return runTaskForAdapter(adapter, provider!, runner)
}

export async function getDeposits({
  userAddress,
  fromBlock,
  toBlock,
  protocolTokenAddress,
  tokenId,
  protocolId,
  chainId,
  productId,
}: GetEventsRequestInput): Promise<DefiMovementsResponse> {
  const provider = chainProviders[chainId]

  let adapter: IProtocolAdapter
  try {
    adapter = adaptersController.fetchAdapter(chainId, protocolId, productId)
  } catch (error) {
    return handleError(error)
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

  return runTaskForAdapter(adapter, provider!, runner)
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

    return {
      tokens: tokens.map((value) =>
        enrichTotalValueLocked(value, adapter.chainId),
      ),
    }
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
          const provider = chainProviders[chainId]!

          const chainProtocolAdapters =
            adaptersController.fetchChainProtocolAdapters(chainId, protocolId)

          return Array.from(chainProtocolAdapters, async ([_, adapter]) => {
            return runTaskForAdapter(adapter, provider, runner)
          })
        })
    })

  return Promise.all(protocolPromises)
}

async function runTaskForAdapter<ReturnType>(
  adapter: IProtocolAdapter,
  provider: ethers.JsonRpcProvider,
  runner: (
    adapter: IProtocolAdapter,
    provider: ethers.JsonRpcProvider,
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
      ...handleError(error),
    }
  }
}

function handleError(error: unknown): {
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
