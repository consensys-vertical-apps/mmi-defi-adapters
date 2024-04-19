import { Underlying, ProtocolPosition, TokenType } from '../../types/adapter'
import { aggregateFiatBalances } from './aggregateFiatBalances'

const balanceRaw = 2000000000000000000n
const priceRaw = BigInt(Math.pow(2, 18))
const decimals = 18

const usdRaw = (balanceRaw * priceRaw) / BigInt(10 ** decimals)

const protocolToken = {
  address: '0x',
  name: 'Joe Coin',
  symbol: 'jcoin',
  type: TokenType.Protocol,
  decimals,
  priceRaw: undefined,
  balanceRaw,
  tokenId: undefined,
}

const underlyingToken = {
  address: '0x1',
  decimals,
  balanceRaw,
  priceRaw,
  name: 'Joe Coin',
  symbol: 'jcoin',
  type: TokenType.Underlying,
}

describe('aggregateFiatBalances', () => {
  it('handles empty input', () => {
    expect(aggregateFiatBalances([])).toEqual({})
  })

  it('handles nested tokens correctly', () => {
    const testData = [
      {
        ...protocolToken,

        tokens: [
          {
            ...underlyingToken,
            priceRaw: undefined,
            tokens: [underlyingToken],
          },
        ],
      },
    ]

    expect(aggregateFiatBalances(testData)).toEqual({
      [protocolToken.address]: {
        protocolTokenMetadata: {
          address: '0x',
          name: 'Joe Coin',
          decimals,
          symbol: 'jcoin',
          tokenId: undefined,
        },
        usdRaw,
      },
    })
  })

  it('correctly aggregates balances for tokens with same identifier', () => {
    const testData = [
      {
        ...protocolToken,
        tokens: [
          {
            ...underlyingToken,
            priceRaw: undefined,
            tokens: [underlyingToken],
          },
          {
            ...underlyingToken,
            priceRaw: undefined,
            tokens: [underlyingToken],
          },
        ],
      },
    ]

    expect(
      aggregateFiatBalances(
        testData as unknown as (Underlying | ProtocolPosition)[],
      ),
    ).toEqual({
      '0x': {
        protocolTokenMetadata: {
          address: '0x',
          name: 'Joe Coin',
          decimals,
          symbol: 'jcoin',
          tokenId: undefined,
        },
        usdRaw: usdRaw * 2n,
      },
    })
  })
})
