import { Underlying } from '@metamask-institutional/defi-sdk'

import { DisplayPosition } from '../../types/response'

import { TokenType } from '../../types/adapter'
import { propagatePrice } from './propagatePrice'

describe('calculateTokenPrice', () => {
  it('should correctly calculate the price for a leaf node token', () => {
    const token = {
      address: '0xParentToken',
      balance: 100,
      type: TokenType.Underlying,
      tokens: [
        {
          address: '0xLeafToken',
          price: 2,
          type: TokenType.Underlying,
          decimals: 18,
          balance: 100,
        },
      ],
    } as unknown as DisplayPosition<Underlying>

    const result = propagatePrice(token)
    expect(result).toBe(200) // balance * price = 100 * 2
  })

  it('should throw an error if price is undefined in a leaf token', () => {
    const token = {
      address: '0xParentToken',
      balance: 100,
      type: TokenType.Underlying,
      tokens: [
        {
          address: '0xLeafToken',
          price: undefined,
          type: TokenType.Underlying,
          decimals: 18,
          balance: 100,
        },
      ],
    } as unknown as DisplayPosition<Underlying>

    expect(() => propagatePrice(token)).toThrow(
      'Price not defined for token at address 0xLeafToken',
    )
  })

  it('should correctly calculate the aggregate price for a parent with multiple leaf tokens', () => {
    const token = {
      address: '0xParentToken',
      balance: 100,
      type: TokenType.Underlying,
      tokens: [
        {
          address: '0xChildToken1',
          price: 2,
          type: TokenType.Underlying,
          decimals: 18,
          balance: 50,
        },
        {
          address: '0xChildToken2',
          price: 3,
          type: TokenType.Underlying,
          decimals: 18,
          balance: 50,
        },
      ],
    } as unknown as DisplayPosition<Underlying>

    const result = propagatePrice(token)
    expect(result).toBe(250) // (50 * 2) + (50 * 3) = 100 + 150 = 250
    expect(token.price).toBe(2.5) // Aggregated value (250) / parent balance (100) = 2.5
  })

  it('should handle nested tokens correctly', () => {
    const token = {
      address: '0xParentToken',
      balance: 100,
      tokens: [
        {
          address: '0xChildToken1',
          balance: 50,
          price: 2,
          tokens: [],
        },
        {
          address: '0xChildToken2',
          balance: 25,
          price: 4,
          tokens: [],
        },
        {
          address: '0xChildToken3',
          balance: 25,
          // price 7
          tokens: [
            {
              address: '0xGrandchildToken1',
              balance: 10,
              price: 10,
              tokens: [],
            },
            {
              address: '0xGrandchildToken2',
              balance: 15,
              price: 5,
              tokens: [],
            },
          ],
        },
      ],
    } as unknown as DisplayPosition<Underlying>

    const result = propagatePrice(token)
    expect(result).toBe(375) // (50 * 2) + (25 * 4) + ((10 * 10) + (15 * 5)) = 100 + 100 + 225 = 425
    expect(token.price).toBe(3.75) // Aggregated value (425) / parent balance (100) = 4.25
  })

  it('should handle tokens with no balance gracefully', () => {
    const token = {
      address: '0xParentToken',
      balance: 0,
      tokens: [
        {
          address: '0xChildToken1',
          balance: 50,
          price: 2,
          tokens: [],
        },
      ],
    } as unknown as DisplayPosition<Underlying>

    const result = propagatePrice(token)
    expect(result).toBe(100) // Child value (50 * 2) = 100
    expect(token.price).toBe(100) // Division by zero case handled
  })

  it('should handle tokens with zero children', () => {
    const token = {
      address: '0xParentToken',
      balance: 100,
      tokens: [],
    } as unknown as DisplayPosition<Underlying>

    expect(() => propagatePrice(token)).toThrow(
      'Price not defined for token at address 0xParentToken',
    )
  })
})
