import { TokenType } from '@metamask-institutional/defi-adapters/dist/types/adapter.js'
import { describe, expect, it } from 'vitest'
import { buildMemoryUnwrapCacheProvider } from './memory-unwrap-price-cache-provider.js'

describe('buildMemoryUnwrapCacheProvider', () => {
  it('should create a cache provider with get and set methods', () => {
    const provider = buildMemoryUnwrapCacheProvider()
    expect(provider).toHaveProperty('getFromDb')
    expect(provider).toHaveProperty('setToDb')
    expect(typeof provider.getFromDb).toBe('function')
    expect(typeof provider.setToDb).toBe('function')
  })

  it('should store and retrieve values from the cache', async () => {
    const provider = buildMemoryUnwrapCacheProvider()
    const testKey = 'test-key'
    const testValue = {
      address: '0x123',
      name: 'Test Token',
      symbol: 'TEST',
      decimals: 18,
      baseRate: 1 as const,
      type: TokenType.Protocol,
    }

    const initialValue = await provider.getFromDb(testKey)
    expect(initialValue).toBeUndefined()

    await provider.setToDb(testKey, testValue)

    const retrievedValue = await provider.getFromDb(testKey)
    expect(retrievedValue).toEqual(testValue)
  })

  it('should update existing values in the cache', async () => {
    const provider = buildMemoryUnwrapCacheProvider()
    const testKey = 'test-key'
    const initialValue = {
      address: '0x123',
      name: 'Test Token',
      symbol: 'TEST',
      decimals: 18,
      baseRate: 1 as const,
      type: TokenType.Protocol,
    }
    const updatedValue = {
      address: '0x123',
      name: 'Updated Token',
      symbol: 'TEST',
      decimals: 18,
      baseRate: 1 as const,
      type: TokenType.Protocol,
    }

    await provider.setToDb(testKey, initialValue)
    expect(await provider.getFromDb(testKey)).toEqual(initialValue)

    await provider.setToDb(testKey, updatedValue)
    expect(await provider.getFromDb(testKey)).toEqual(updatedValue)
  })
})
