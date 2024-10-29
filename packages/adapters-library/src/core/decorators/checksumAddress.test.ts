import { getAddress } from 'ethers'
import { DefiProvider } from '../../defiProvider'
import { ChecksumAddress } from './checksumAddress'

// Mock the getAddress function from ethers to simplify testing
jest.mock('ethers', () => ({
  getAddress: jest.fn((address: string) => `checksum-${address}`),
}))

describe('ChecksumAddress Decorator', () => {
  let originalMethod: jest.Mock

  beforeEach(() => {
    originalMethod = jest.fn().mockResolvedValue('original method result')
  })

  it('should convert a single address string to checksum format', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Decorator code
    const methodWithChecksum = ChecksumAddress(originalMethod, {} as any)

    const params = {
      filterProtocolToken: '0x1234567890abcdef1234567890abcdef12345678',
    }
    // biome-ignore lint/suspicious/noExplicitAny: Decorator code
    await methodWithChecksum.call({} as any, params)

    expect(getAddress).toHaveBeenCalledWith(
      '0x1234567890abcdef1234567890abcdef12345678',
    )
    expect(params.filterProtocolToken).toBe(
      'checksum-0x1234567890abcdef1234567890abcdef12345678',
    )
    expect(originalMethod).toHaveBeenCalledWith(params)
  })

  it('should convert an array of address strings to checksum format', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Decorator code
    const methodWithChecksum = ChecksumAddress(originalMethod, {} as any)

    const params = {
      oioi: [
        '0x1234567890abcdef1234567890abcdef12345678',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ],
    }

    await methodWithChecksum.call({} as DefiProvider, params)

    expect(getAddress).toHaveBeenCalledWith(
      '0x1234567890abcdef1234567890abcdef12345678',
    )
    expect(getAddress).toHaveBeenCalledWith(
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    )
    expect(params.oioi).toEqual([
      'checksum-0x1234567890abcdef1234567890abcdef12345678',
      'checksum-0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    ])
    expect(originalMethod).toHaveBeenCalledWith(params)
  })

  it('should leave non-address parameters unchanged', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Decorator code
    const methodWithChecksum = ChecksumAddress(originalMethod, {} as any)

    const params = {
      filterProtocolToken: '0x1234567890abcdef1234567890abcdef12345678',
      filterChainIds: [1, 56, 137],
    }
    await methodWithChecksum.call({} as DefiProvider, params)

    expect(getAddress).toHaveBeenCalledWith(
      '0x1234567890abcdef1234567890abcdef12345678',
    )
    expect(params.filterChainIds).toEqual([1, 56, 137])
    expect(originalMethod).toHaveBeenCalledWith(params)
  })

  it('should leave non-address items in an array unchanged', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Decorator code
    const methodWithChecksum = ChecksumAddress(originalMethod, {} as any)

    const params = {
      filterProtocolTokens: [
        '0x1234567890abcdef1234567890abcdef12345678',
        123,
        'notAnAddress',
      ],
    }
    await methodWithChecksum.call({} as DefiProvider, params)

    expect(getAddress).toHaveBeenCalledWith(
      '0x1234567890abcdef1234567890abcdef12345678',
    )
    expect(params.filterProtocolTokens).toEqual([
      'checksum-0x1234567890abcdef1234567890abcdef12345678',
      123,
      'notAnAddress',
    ])
    expect(originalMethod).toHaveBeenCalledWith(params)
  })

  it('should call the original method with modified arguments', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Decorator code
    const methodWithChecksum = ChecksumAddress(originalMethod, {} as any)

    const params = {
      filterProtocolToken: '0x1234567890abcdef1234567890abcdef12345678',
    }
    const result = await methodWithChecksum.call({} as DefiProvider, params)

    expect(originalMethod).toHaveBeenCalledWith(params)
    expect(result).toBe('original method result')
  })
})
