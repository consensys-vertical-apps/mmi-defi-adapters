import { MovementsByBlock } from '../../types/adapter'
import { aggregateFiatBalancesFromMovements } from './aggregateFiatBalancesFromMovements'

describe('aggregateFiatBalancesFromMovements', () => {
  it('handles empty input', () => {
    expect(aggregateFiatBalancesFromMovements([])).toEqual({})
  })

  it('aggregates single fiat token correctly', () => {
    const testData = [
      {
        protocolToken: {
          address: '0x',
          name: 'Joe Coin',
          symbol: 'jcoin',
          decimals: 18,
        },
        tokens: [
          {
            type: 'underlying',
            address: '0x1',
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
      aggregateFiatBalancesFromMovements(
        testData as unknown as MovementsByBlock[],
      ),
    ).toEqual({
      '0x': {
        protocolTokenMetadata: {
          address: '0x',
          decimals: 18,
          name: 'Joe Coin',
          symbol: 'jcoin',
          tokenId: undefined,
        },
        usdRaw: 5n,
      },
    })
  })

  it('aggregates across multiple movements', () => {
    const testData = [
      {
        protocolToken: {
          address: '0x',
          name: 'Joe Coin',
          symbol: 'jcoin',
          decimals: 18,
        },
        tokens: [
          {
            type: 'underlying',
            address: '0x1',
            tokens: [
              {
                type: 'fiat',
                balanceRaw: 5n,
              },
            ],
          },
          {
            type: 'underlying',
            address: '0x1',
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
        protocolToken: {
          address: '0x',
          name: 'Joe Coin',
          symbol: 'jcoin',
          decimals: 18,
        },
        tokens: [
          {
            type: 'underlying',
            address: '0x1',
            tokens: [
              {
                type: 'fiat',
                balanceRaw: 5n,
              },
            ],
          },
          {
            type: 'underlying',
            address: '0x1',
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
        protocolToken: {
          address: '0x1',
          name: 'Joe Coin1',
          symbol: 'jcoin1',
          decimals: 18,
        },
        tokens: [
          {
            type: 'underlying',
            address: '0x1',
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
      aggregateFiatBalancesFromMovements(
        testData as unknown as MovementsByBlock[],
      ),
    ).toEqual({
      '0x': {
        protocolTokenMetadata: {
          address: '0x',
          decimals: 18,
          name: 'Joe Coin',
          symbol: 'jcoin',
          tokenId: undefined,
        },
        usdRaw: 20n,
      },
      '0x1': {
        protocolTokenMetadata: {
          address: '0x1',
          decimals: 18,
          name: 'Joe Coin1',
          symbol: 'jcoin1',
          tokenId: undefined,
        },
        usdRaw: 5n,
      },
    })
  })

  it('handles nested tokens', () => {
    const testData = [
      {
        protocolToken: {
          address: '0x',
          name: 'Joe Coin',
          symbol: 'jcoin',
          decimals: 18,
        },
        tokens: [
          {
            type: 'underlying',
            address: '0x1',
            tokens: [
              {
                type: 'underlying',
                address: '0x1',
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
            type: 'underlying',
            address: '0x1',
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
        protocolToken: {
          address: '0x',
          name: 'Joe Coin',
          symbol: 'jcoin',
          decimals: 18,
        },
        tokens: [
          {
            type: 'underlying',
            address: '0x1',
            tokens: [
              {
                type: 'fiat',
                balanceRaw: 5n,
              },
            ],
          },
          {
            type: 'underlying',
            address: '0x1',
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
      aggregateFiatBalancesFromMovements(
        testData as unknown as MovementsByBlock[],
      ),
    ).toEqual({
      '0x': {
        protocolTokenMetadata: {
          address: '0x',
          decimals: 18,
          name: 'Joe Coin',
          symbol: 'jcoin',
          tokenId: undefined,
        },
        usdRaw: 20n,
      },
    })
  })

  it('throws error for non-fiat token at base', async () => {
    const testData = [
      {
        protocolToken: {
          address: '0x',
          name: 'Joe Coin',
          symbol: 'jcoin',
          decimals: 18,
        },
        tokens: [
          {
            type: 'underlying',
            address: '0x1',
            tokens: [
              {
                type: 'underlying',
                address: '0x1',
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
            type: 'underlying',
            address: '0x1',
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
        protocolToken: {
          address: '0x',
          name: 'Joe Coin',
          symbol: 'jcoin',
          decimals: 18,
        },
        tokens: [
          {
            type: 'underlying',
            address: '0x1',
            tokens: [
              {
                type: 'non-fiat',
                balanceRaw: 5n,
                address: 'non-fiat',
              },
            ],
          },
          {
            type: 'underlying',
            address: '0x1',
            tokens: [
              {
                type: 'non-fiat',
                balanceRaw: 5n,
                address: 'non-fiat',
              },
            ],
          },
        ],
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
