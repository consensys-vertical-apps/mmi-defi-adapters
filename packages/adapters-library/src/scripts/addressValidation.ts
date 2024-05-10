import { getAddress, isAddress } from 'ethers'
import { Json } from '../types/json'

export function getMetadataInvalidAddresses(metadata: Json): string[] {
  if (typeof metadata === 'string') {
    return isChecksummedOrNonEthAddress(metadata) ? [] : [metadata]
  }

  if (Array.isArray(metadata)) {
    return metadata.flatMap((value) => getMetadataInvalidAddresses(value) || [])
  }

  if (metadata && typeof metadata === 'object') {
    return Object.entries(metadata).flatMap(([key, value]) => {
      const keyInvalidAddresses = getMetadataInvalidAddresses(key)
      const valueInvalidAddresses = getMetadataInvalidAddresses(value)

      return [...keyInvalidAddresses, ...valueInvalidAddresses]
    })
  }

  return []
}

export function isChecksummedOrNonEthAddress(address: string): boolean {
  // isAddress and getAddress throw when the address has a mixture of upper and lower case characters
  // This function should not throw in that event, that's why a regex is used instead
  return (
    !address.match(/^0x[a-fA-F0-9]{40}$/) ||
    (isAddress(address) && getAddress(address) === address)
  )
}
