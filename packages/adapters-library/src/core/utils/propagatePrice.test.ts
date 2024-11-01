import { DisplayPosition } from '../../types/response'

import { TokenType, Underlying } from '../../types/adapter'
import { Chain } from '../constants/chains'
import { propagatePrice } from './propagatePrice'

describe('calculateTokenPrice', () => {
  const chainId = Chain.Ethereum

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

    const result = propagatePrice(token, chainId)
    expect(result).toBe(200) // balance * price = 100 * 2
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

    const result = propagatePrice(token, chainId)
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

    const result = propagatePrice(token, chainId)
    expect(result).toBe(375) // (50 * 2) + (25 * 4) + (((10 * 10) + (15 * 5)) / 25) * 25 = 100 + 100 + 175 = 375
    expect(token.price).toBe(3.75) // Aggregated value (375) / parent balance (100) = 3.75
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

    const result = propagatePrice(token, chainId)
    expect(result).toBe(100) // Child value (50 * 2) = 100
    expect(token.price).toBe(100) // Division by zero case handled by assuming balance of 1
  })

  it('should handle tokens with zero children', () => {
    const token = {
      address: '0xParentToken',
      balance: 100,
      tokens: [],
    } as unknown as DisplayPosition<Underlying>

    const result = propagatePrice(token, chainId)
    expect(result).toBe(undefined) // Parent price cannot be calculated
    expect(token.price).toBe(undefined) // Parent's price should be set to undefined
  })

  it('should propagate undefined if one child token is missing a price', () => {
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
          price: undefined, // Missing price
          type: TokenType.Underlying,
          decimals: 18,
          balance: 50,
        },
      ],
    } as unknown as DisplayPosition<Underlying>

    const result = propagatePrice(token, chainId)
    expect(result).toBe(undefined) // Parent price cannot be calculated
    expect(token.price).toBe(undefined) // Parent's price should be set to undefined
  })

  it('should propagate undefined if one nested child token is missing a price', () => {
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
          type: TokenType.Underlying,
          decimals: 18,
          balance: 50,
          tokens: [
            {
              address: '0xNestedChildToken2',
              price: undefined, // Missing price
              type: TokenType.Underlying,
              decimals: 18,
              balance: 50,
            },
          ],
        },
      ],
    } as unknown as DisplayPosition<Underlying>

    const result = propagatePrice(token, chainId)
    expect(result).toBe(undefined) // Parent price cannot be calculated
    expect(token.price).toBe(undefined) // Parent's price should be set to undefined
  })
})
