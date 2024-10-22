import { MovementsByBlock, TokenType } from '../../types/adapter'
import { aggregateFiatBalancesFromMovements } from './aggregateFiatBalancesFromMovements'

const balanceRaw = 2n * 10n ** 18n
const priceRaw = BigInt(Math.pow(2, 18))
const decimals = 18

const usdRaw = (balanceRaw * priceRaw) / BigInt(10 ** decimals)

const protocolToken1 = {
  address: '0x1',
  name: 'Joe Coin',
  symbol: 'jcoin',
  decimals,

  tokenId: undefined,
}
const protocolToken2 = {
  address: '0x2',
  name: 'Joe Coin 2',
  symbol: 'jcoin2',
  decimals,

  tokenId: undefined,
}
const underlyingToken = {
  name: 'underlying',
  symbol: 'underlying',
  type: TokenType.Underlying,
  address: '0x1',
  decimals,
  balanceRaw,
  priceRaw,
}

describe('aggregateFiatBalancesFromMovements', () => {
  it('handles empty input', () => {
    expect(aggregateFiatBalancesFromMovements([])).toEqual({})
  })

  it('aggregates across multiple movements', () => {
    const testData: MovementsByBlock[] = [
      {
        protocolToken: protocolToken1,
        tokens: [underlyingToken, underlyingToken],
        blockNumber: 11,
        transactionHash: '0x',
      },
      {
        protocolToken: protocolToken2,
        tokens: [underlyingToken, underlyingToken],
        blockNumber: 11,
        transactionHash: '0x',
      },
      {
        protocolToken: protocolToken2,
        tokens: [underlyingToken],
        blockNumber: 11,
        transactionHash: '0x',
      },
    ]

    const result = aggregateFiatBalancesFromMovements(testData)

    expect(result).toEqual({
      [protocolToken1.address]: {
        protocolTokenMetadata: protocolToken1,

        usdRaw: usdRaw * 2n,
      },
      [protocolToken2.address]: {
        protocolTokenMetadata: protocolToken2,
        usdRaw: usdRaw * 3n,
      },
    })
  })

  it('handles nested tokens', () => {
    const testData = [
      {
        protocolToken: protocolToken1,
        tokens: [
          {
            ...underlyingToken,
            priceRaw: undefined,
            tokens: [underlyingToken],
          },
        ],
      },
      {
        protocolToken: protocolToken1,
        tokens: [underlyingToken, underlyingToken],
      },
    ]

    const result = aggregateFiatBalancesFromMovements(
      testData as MovementsByBlock[],
    )

    expect(result).toEqual({
      [protocolToken1.address]: {
        protocolTokenMetadata: protocolToken1,
        usdRaw: usdRaw * 3n,
      },
    })
  })

  it('returns empty object when passed empty array', () => {
    expect(aggregateFiatBalancesFromMovements([])).toEqual({})
  })
})
