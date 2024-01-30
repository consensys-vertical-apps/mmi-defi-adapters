import { MovementsByBlock, TokenType } from '../../types/adapter'
import { aggregateFiatBalancesFromMovements } from './aggregateFiatBalancesFromMovements'

const balanceRaw = 2000000000000000000n
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
const underlyingTokenWithPrice = {
  name: 'underlying',
  symbol: 'underlying',
  type: TokenType.Underlying,
  address: '0x1',
  decimals,
  balanceRaw,
  priceRaw,
}
const underlyingTokenWithoutPrice = {
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
        tokens: [underlyingTokenWithPrice, underlyingTokenWithPrice],
        blockNumber: 11,
        transactionHash: '0x',
      },
      {
        protocolToken: protocolToken2,
        tokens: [underlyingTokenWithPrice, underlyingTokenWithPrice],
        blockNumber: 11,
        transactionHash: '0x',
      },
      {
        protocolToken: protocolToken2,
        tokens: [underlyingTokenWithPrice],
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
            ...underlyingTokenWithoutPrice,

            tokens: [underlyingTokenWithPrice],
          },
          underlyingTokenWithoutPrice,
        ],
      },
      {
        protocolToken: protocolToken1,
        tokens: [underlyingTokenWithPrice, underlyingTokenWithPrice],
      },
    ]

    expect(
      aggregateFiatBalancesFromMovements(
        testData as unknown as MovementsByBlock[],
      ),
    ).toEqual({
      [protocolToken1.address]: {
        protocolTokenMetadata: protocolToken1,
        usdRaw: usdRaw * 4n,
      },
    })
  })

  it('throws error for non-fiat token at base', async () => {
    const testData = [
      {
        protocolToken: protocolToken1,
        tokens: [
          {
            ...underlyingTokenWithoutPrice,
            tokens: [underlyingTokenWithoutPrice],
          },
          underlyingTokenWithoutPrice,
        ],
      },
      {
        protocolToken: protocolToken1,
        tokens: [underlyingTokenWithoutPrice, underlyingTokenWithoutPrice],
      },
    ]

    try {
      await aggregateFiatBalancesFromMovements(
        testData as unknown as MovementsByBlock[],
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      expect(error.message).toEqual(
        'Unable to calculate profits, missing USD price for token movement: non-fiat',
      )
    }
  })
})
