import { Protocol } from '../adapters/protocols'
import { Chain, ChainName } from '../core/constants/chains'
import { filterMap } from '../core/utils/filters'

export function chainFilter(filterInput?: string): Chain | undefined {
  if (!filterInput) {
    return
  }

  const chainId = Object.entries(Chain)
    .map(([chainKey, chainId]) => {
      return {
        chainId,
        filterValues: [
          chainId.toString(),
          chainKey.toLowerCase(),
          ChainName[chainId].toLowerCase(),
        ],
      }
    })
    .find(({ filterValues }) =>
      filterValues.includes(filterInput.trim().toLowerCase()),
    )?.chainId

  if (!chainId) {
    throw new Error(`No chain matches the given filter: ${filterInput}`)
  }

  return chainId
}

export function protocolFilter(filterInput?: string): Protocol | undefined {
  if (!filterInput) {
    return
  }

  const protocolId = Object.entries(Protocol)
    .map(([protocolKey, protocolId]) => {
      return {
        protocolId,
        filterValues: [protocolId, protocolKey.toLowerCase()],
      }
    })
    .find(({ filterValues }) =>
      filterValues.includes(filterInput.trim().toLowerCase()),
    )?.protocolId

  if (!protocolId) {
    throw new Error(`No protocol matches the given filter: ${filterInput}`)
  }

  return protocolId
}

export function multiChainFilter(filterInput?: string): Chain[] | undefined {
  if (!filterInput) {
    return
  }

  return filterMap(filterInput?.split(','), (filter) => {
    const cleanFilter = filter.trim()
    return cleanFilter ? chainFilter(cleanFilter) : undefined
  })
}

export function multiProtocolFilter(
  filterInput?: string,
): Protocol[] | undefined {
  if (!filterInput) {
    return
  }

  return filterMap(filterInput?.split(','), (filter) => {
    const cleanFilter = filter.trim()
    return cleanFilter ? protocolFilter(cleanFilter) : undefined
  })
}
