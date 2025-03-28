import { describe, expect, it } from 'vitest'
import './bigint-json'

describe('BigInt JSON serialization', () => {
  it('should serialize BigInt to string', () => {
    const bigNumber = BigInt('9007199254740991')
    const serialized = JSON.stringify(bigNumber)
    expect(serialized).toBe('"9007199254740991"')
  })

  it('should handle zero', () => {
    const zero = BigInt(0)
    const serialized = JSON.stringify(zero)
    expect(serialized).toBe('"0"')
  })

  it('should handle negative numbers', () => {
    const negative = BigInt(-42)
    const serialized = JSON.stringify(negative)
    expect(serialized).toBe('"-42"')
  })

  it('should serialize BigInt within objects', () => {
    const obj = {
      id: BigInt(123),
      name: 'test',
    }
    const serialized = JSON.stringify(obj)
    expect(serialized).toBe('{"id":"123","name":"test"}')
  })

  it('should serialize BigInt within arrays', () => {
    const arr = [BigInt(1), BigInt(2), BigInt(3)]
    const serialized = JSON.stringify(arr)
    expect(serialized).toBe('["1","2","3"]')
  })
})
