import { Underlying, ProtocolPosition } from '../../types/adapter'
import { aggregateFiatBalances } from './aggregateFiatBalances'

describe('aggregateFiatBalances', () => {
  it('handles empty input', () => {
    expect(aggregateFiatBalances([])).toEqual({})
  })

  it('aggregates single fiat token correctly', () => {
    const testData = [
      {
        address: '0x',
        name: 'LP Coin',
        symbol: 'lp',
        type: 'protocol',
        tokens: [
          {
            address: '0x',
            name: 'JCoin',
            symbol: 'JCoin',
            type: 'underlying',
            tokens: [
              {
                type: 'fiat',
                balanceRaw: 5n,
              },
            ],
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
          decimals: undefined,
          name: 'LP Coin',
          symbol: 'lp',
          tokenId: undefined,
        },
        usdRaw: 5n,
      },
    })
  })

  it('handles nested tokens correctly', () => {
    const testData = [
      {
        address: '0x',
        name: 'LP Coin',
        symbol: 'lp',
        type: 'protocol',
        tokens: [
          {
            address: '0x',
            name: 'JCoin',
            symbol: 'JCoin',
            decimals: 8,
            balanceRaw: '38951892054n',
            type: 'underlying',
            tokens: [
              {
                address: '0x',
                name: 'JCoin',
                symbol: 'JCoin',
                decimals: 8,
                balanceRaw: '38951892054n',
                type: 'underlying',
                tokens: [
                  {
                    type: 'fiat',
                    balanceRaw: 5n,
                  },
                ],
              },
            ],
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
          decimals: undefined,
          name: 'LP Coin',
          symbol: 'lp',
          tokenId: undefined,
        },
        usdRaw: 5n,
      },
    })
  })

  it('throws error for non-fiat token at base', () => {
    const testData = [
      {
        address: '0x',
        name: 'LP Coin',
        symbol: 'lp',
        type: 'protocol',
        tokens: [
          {
            address: '0x',
            name: 'JCoin',
            symbol: 'JCoin',
            decimals: 8,
            balanceRaw: '38951892054n',
            type: 'underlying',
            tokens: [
              {
                address: '0x',
                name: 'JCoin',
                symbol: 'JCoin',
                decimals: 8,
                balanceRaw: '38951892054n',
                type: 'underlying',
              },
            ],
          },
        ],
      },
    ]

    try {
      aggregateFiatBalances(
        testData as unknown as (Underlying | ProtocolPosition)[],
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      expect(error.message).toEqual(
        'Unable to calculate profits, missing USD price for token position 0x',
      )
    }
  })

  it('correctly aggregates balances for tokens with same identifier', () => {
    const testData = [
      {
        address: '0x',
        name: 'LP Coin',
        symbol: 'lp',
        type: 'protocol',
        tokens: [
          {
            address: '0x',
            name: 'JCoin',
            symbol: 'JCoin',
            decimals: 8,
            balanceRaw: '38951892054n',
            type: 'underlying',
            tokens: [
              {
                address: '0x',
                name: 'JCoin',
                symbol: 'JCoin',
                decimals: 8,
                balanceRaw: '38951892054n',
                type: 'underlying',
                tokens: [
                  {
                    type: 'fiat',
                    balanceRaw: 5n,
                  },
                ],
              },
            ],
          },
          {
            address: '0x',
            name: 'JCoin',
            symbol: 'JCoin',
            decimals: 8,
            balanceRaw: '38951892054n',
            type: 'underlying',
            tokens: [
              {
                address: '0x',
                name: 'JCoin',
                symbol: 'JCoin',
                decimals: 8,
                balanceRaw: '38951892054n',
                type: 'underlying',
                tokens: [
                  {
                    type: 'fiat',
                    balanceRaw: 5n,
                  },
                ],
              },
            ],
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
          decimals: undefined,
          name: 'LP Coin',
          symbol: 'lp',
          tokenId: undefined,
        },
        usdRaw: 10n,
      },
    })
  })
})
