import { getAddress, isAddress } from 'ethers'
import type { Json } from '../../types/json.js'

export function getInvalidAddresses(data: Json): string[] {
  if (typeof data === 'string') {
    return isChecksummedOrNonEthAddress(data) ? [] : [data]
  }

  if (Array.isArray(data)) {
    return data.flatMap((value) => getInvalidAddresses(value) || [])
  }

  if (data && typeof data === 'object') {
    return Object.entries(data).flatMap(([key, value]) => {
      const keyInvalidAddresses = getInvalidAddresses(key)
      const valueInvalidAddresses = getInvalidAddresses(value)

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
