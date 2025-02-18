import { Protocol } from '../../adapters/protocols.js'
import { Chain, ChainIdToChainNameMap } from '../constants/chains.js'
import {
  chainFilter,
  multiChainFilter,
  multiProtocolFilter,
  protocolFilter,
} from './parameter-filters.js'

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
      (chainId) => [ChainIdToChainNameMap[chainId], chainId] as [string, Chain],
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

  it('throws when the filter provided fails to match a chain', () => {
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

  it('throws when the filter provided fails to match a protocol', () => {
    const filterInput = 'invalidProtocolFilter'
    expect(() => protocolFilter(filterInput)).toThrow(
      `No protocol matches the given filter: ${filterInput}`,
    )
  })
})

describe('multiChainFilter', () => {
  it('returns an array of chainIds when a valid filterInput is provided', () => {
    const filterInput = 'ethereum,LINEA,250'
    const expectedOutput = [Chain.Ethereum, Chain.Linea, Chain.Fantom]

    expect(multiChainFilter(filterInput)).toEqual(expectedOutput)
  })

  it.each([
    ["''", ''],
    ['undefined', undefined],
  ])(
    'returns undefined if an empty string or undefined is provided as a filter: %s',
    (_, filterInput) => {
      expect(multiChainFilter(filterInput)).toBeUndefined()
    },
  )

  it.each([['invalidChain'], ['2387163678']])(
    'throws when the filter provided fails to match a chain: %s',
    (invalidChain) => {
      const filterInput = `ethereum,${invalidChain},linea`
      expect(() => multiChainFilter(filterInput)).toThrow(
        `No chain matches the given filter: ${invalidChain}`,
      )
    },
  )
})

describe('multiProtocolFilter', () => {
  it('returns an array of protocolIds when a valid filterInput is provided', () => {
    const filterInput = 'stargate,AAVE-v2'
    const expectedOutput = [Protocol.Stargate, Protocol.AaveV2]

    expect(multiProtocolFilter(filterInput)).toEqual(expectedOutput)
  })

  it.each([
    ["''", ''],
    ['undefined', undefined],
  ])(
    'returns undefined if an empty string or undefined is provided as a filter: %s',
    (_, filterInput) => {
      expect(multiProtocolFilter(filterInput)).toBeUndefined()
    },
  )

  it('throws when the filter provided fails to match a protocol', () => {
    const filterInput = 'stargate,invalidProtocol'
    expect(() => multiProtocolFilter(filterInput)).toThrow(
      'No protocol matches the given filter: invalidProtocol',
    )
  })
})
