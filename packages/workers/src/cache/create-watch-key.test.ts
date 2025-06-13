import { describe, expect, it } from 'vitest'
import { createWatchKey } from './create-watch-key.js'

describe('createWatchKey', () => {
  it('should create a watch key from contract address and topic0 in lowercase', () => {
    const contractAddress = '0x1234567890123456789012345678901234567890'
    const topic0 =
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const expectedKey = `${contractAddress.toLowerCase()}#${topic0.toLowerCase()}`

    expect(createWatchKey(contractAddress, topic0)).toBe(expectedKey)
  })

  it('should handle mixed case inputs and convert them to lowercase', () => {
    const contractAddress = '0xAbCDeF123456789012345678901234567890aBcD'
    const topic0 =
      '0xDDF252AD1BE2C89B69C2B068FC378DAA952BA7F163C4A11628F55A4DF523B3EF'
    const expectedKey = `${contractAddress.toLowerCase()}#${topic0.toLowerCase()}`

    expect(createWatchKey(contractAddress, topic0)).toBe(expectedKey)
  })
})
