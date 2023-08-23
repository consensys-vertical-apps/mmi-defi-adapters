import 'dotenv/config'

import { ethers } from 'ethers'
import { supportedProtocols } from './adapters'
import { Chain } from './core/constants/chains'
import { Protocol } from './core/constants/protocols'
import { chainProviders } from './core/utils/chainProviders'
import { fulfilledPromises } from './core/utils/filters'
import { logger } from './core/utils/logger'
import { IProtocolAdapter, DefiProfitsResponse } from './types/adapter'
import {
  DefiPositionResponse,
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
    const tokens = await adapter.getPricePerShare({})
    return { ...adapter.getProtocolDetails(), tokens }
  }

  return runForAllProtocolsAndChains({
    runner,
    filterProtocolId,
    filterChainId,
  })
}

export async function getTotalValueLocks({
  filterProtocolId,
  filterChainId,
}: {
  filterProtocolId?: Protocol
  filterChainId?: Chain
}): Promise<TotalValueLockResponse[]> {
  const runner = async (adapter: IProtocolAdapter) => {
    const tokens = await adapter.getTotalValueLock({})
    return { ...adapter.getProtocolDetails(), tokens }
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
