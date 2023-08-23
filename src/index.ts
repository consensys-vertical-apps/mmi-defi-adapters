import 'dotenv/config'

import { supportedProtocols } from './adapters'
import { Chain } from './core/constants/chains'
import { Protocol } from './core/constants/protocols'
import { fulfilledPromises } from './core/utils/filters'
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
  const runner = async (adapter: IProtocolAdapter) => {
    const profits = await adapter.getOneDayProfit({
      userAddress,
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
  runner: (adapter: IProtocolAdapter) => ReturnType
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
        .flatMap(([_, adapters]) => {
          return adapters.map(async (adapter) => {
            return await runner(adapter)
          })
        })
    })

  const protocolResults = await Promise.allSettled(protocolPromises)

  return fulfilledPromises(protocolResults)
}
