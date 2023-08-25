import 'dotenv/config'

import { ethers } from 'ethers'
import { supportedProtocols } from './adapters'
import { Chain } from './core/constants/chains'
import { Protocol } from './core/constants/protocols'
import { chainProviders } from './core/utils/chainProviders'
import { fulfilledPromises } from './core/utils/filters'
import { logger } from './core/utils/logger'
import { IProtocolAdapter } from './types/adapter'
import {
  APRResponse,
  APYResponse,
  DefiMovementsResponse,
  DefiPositionResponse,
  DefiProfitsResponse,
  PricePerShareResponse,
  TotalValueLockResponse,
} from './types/response'

export async function getPositions({
  userAddress,
  filterProtocolId,
  filterChainId,
}: {
  userAddress: string
  filterProtocolId?: Protocol
  filterChainId?: Chain
}): Promise<DefiPositionResponse[]> {
  const runner = async (adapter: IProtocolAdapter) => {
    const tokens = await adapter.getPositions({
      userAddress,
    })
    return { ...adapter.getProtocolDetails(), tokens }
  }

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolId,
    filterChainId,
  })
}

export async function getTodaysProfits({
  userAddress,
  filterProtocolId,
  filterChainId,
}: {
  userAddress: string
  filterProtocolId?: Protocol
  filterChainId?: Chain
}): Promise<DefiProfitsResponse[]> {
  const runner = async (
    adapter: IProtocolAdapter,
    provider: ethers.providers.StaticJsonRpcProvider,
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
    filterProtocolId,
    filterChainId,
  })
}

export async function getPrices({
  filterProtocolId,
  filterChainId,
}: {
  filterProtocolId?: Protocol
  filterChainId?: Chain
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
    filterProtocolId,
    filterChainId,
  })
}

export async function getTotalValueLocked({
  filterProtocolId,
  filterChainId,
}: {
  filterProtocolId?: Protocol
  filterChainId?: Chain
}): Promise<TotalValueLockResponse[]> {
  const runner = async (adapter: IProtocolAdapter) => {
    const tokens = await adapter.getTotalValueLocked({})
    return { ...adapter.getProtocolDetails(), tokens }
  }

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolId,
    filterChainId,
  })
}

export async function getApy({
  filterProtocolId,
  filterChainId,
}: {
  filterProtocolId?: Protocol
  filterChainId?: Chain
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
    filterProtocolId,
    filterChainId,
  })
}

export async function getDeposits({
  filterProtocolId,
  filterChainId,
  userAddress,
  fromBlock,
  toBlock,
}: {
  filterProtocolId?: Protocol
  filterChainId?: Chain
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
    filterProtocolId,
    filterChainId,
  })
}

export async function getWithdrawals({
  filterProtocolId,
  filterChainId,
  userAddress,
  fromBlock,
  toBlock,
}: {
  filterProtocolId?: Protocol
  filterChainId?: Chain
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
    filterProtocolId,
    filterChainId,
  })
}

export async function getApr({
  filterProtocolId,
  filterChainId,
}: {
  filterProtocolId?: Protocol
  filterChainId?: Chain
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
    filterProtocolId,
    filterChainId,
  })
}

async function runForAllProtocolsAndChains<ReturnType>({
  runner,
  filterProtocolId,
  filterChainId,
}: {
  runner: (
    adapter: IProtocolAdapter,
    provider: ethers.providers.StaticJsonRpcProvider,
  ) => ReturnType
  filterProtocolId?: Protocol
  filterChainId?: Chain
}) {
  const protocolPromises = Object.entries(supportedProtocols)
    .filter(
      ([protocolId, _]) => !filterProtocolId || filterProtocolId === protocolId,
    )
    .flatMap(([_, supportedChains]) => {
      return Object.entries(supportedChains)
        .filter(([chainId, _]) => {
          return !filterChainId || filterChainId.toString() === chainId
        })
        .flatMap(([chainId, adapters]) => {
          const provider = chainProviders[chainId as unknown as Chain]

          if (!provider) {
            logger.error({ chainId }, 'No provider found for chain')
            throw new Error('No provider found for chain')
          }

          return adapters.map(async (adapterFactory) => {
            return await runner(adapterFactory(provider), provider)
          })
        })
    })

  const protocolResults = await Promise.allSettled(protocolPromises)

  return fulfilledPromises(protocolResults)
}
