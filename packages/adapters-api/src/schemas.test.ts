import { IsEthAddress } from './schemas.js'

describe('schemas', () => {
  describe('IsEthAddress', () => {
    const checksumAddress = '0x018feeDFF5426D16A0ec1da590BB6d3294c25Fe4'
    const lowerCaseAddress = '0x018feedff5426d16a0ec1da590bb6d3294c25fe4'
    const wrongChecksumAddress = '0x018FeeDFF5426D16A0ec1da590BB6d3294c25Fe4' // First f replaced as F

    it.each([
      ['checksumAddress', checksumAddress],
      ['lowerCaseAddress', lowerCaseAddress],
      ['wrongChecksumAddress', wrongChecksumAddress],
    ])(
      'accepts address %s with or without checksum and transforms it',
      (_, address) => {
        const result = IsEthAddress.parse(address)

        expect(result).toEqual(checksumAddress)
      },
    )

    it.each([
      'invalidAddress',
      '0xinvalidAddress',
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1', // 41 characters
    ])('throws error for invalid address', (address) => {
      expect(() => IsEthAddress.parse(address)).toThrow(
        'Invalid ethereum address',
      )
    })
  })
})
