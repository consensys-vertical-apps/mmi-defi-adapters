import { Protocol } from '../adapters'
import { Chain, ChainName } from '../core/constants/chains'
import { chainFilter, protocolFilter } from './filters'

describe('chainFilter', () => {
  it.each(Object.values(Chain).map((chainId) => [chainId]))(
    'returns the correct chainId when any of its ids is provided as a string: %s',
    (chainId) => {
      expect(chainFilter(chainId.toString())).toEqual(chainId)
    },
  )

  it.each(Object.entries(Chain))(
    'returns the correct chainId when any of its keys is provided: %s',
    (chainKey, chainId) => {
      expect(chainFilter(chainKey)).toEqual(chainId)
    },
  )

  it.each(
    Object.values(Chain).map(
      (chainId) => [ChainName[chainId], chainId] as [string, Chain],
    ),
  )(
    'returns the correct chainId when any of its names is provided: %s',
    (chainName, chainId) => {
      expect(chainFilter(chainName)).toEqual(chainId)
    },
  )

  it.each([
    ["''", ''],
    ['undefined', undefined],
  ])(
    'returns undefined if an empty string or undefined is provided as a filter: %s',
    (_, filterInput) => {
      expect(chainFilter(filterInput)).toBeUndefined()
    },
  )

  it('throws when the filter provided cannot return a chainId', () => {
    const filterInput = 'invalidChainFilter'
    expect(() => chainFilter(filterInput)).toThrow(
      `No chain matches the given filter: ${filterInput}`,
    )
  })
})

describe('protocolFilter', () => {
  it.each(Object.values(Protocol).map((protocolId) => [protocolId]))(
    'returns the correct protocolId when any of its ids is provided: %s',
    (protocolId) => {
      expect(protocolFilter(protocolId)).toEqual(protocolId)
    },
  )

  it.each(Object.entries(Protocol))(
    'returns the correct protocolId when any of its keys is provided: %s',
    (protocolKey, protocolId) => {
      expect(protocolFilter(protocolKey)).toEqual(protocolId)
    },
  )

  it.each([
    ["''", ''],
    ['undefined', undefined],
  ])(
    'returns undefined if an empty string or undefined is provided as a filter: %s',
    (_, filterInput) => {
      expect(protocolFilter(filterInput)).toBeUndefined()
    },
  )

  it('throws when the filter provided cannot return a protocolId', () => {
    const filterInput = 'invalidProtocolFilter'
    expect(() => protocolFilter(filterInput)).toThrow(
      `No protocol matches the given filter: ${filterInput}`,
    )
  })
})
