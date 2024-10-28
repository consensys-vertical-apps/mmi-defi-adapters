import { getAddress } from 'ethers'
import { DefiProvider } from '../../defiProvider'

// Regex to check if a string is a valid Ethereum address format
const isEthereumAddress = (address: string) =>
  /^0x[a-fA-F0-9]{40}$/.test(address)

/**
 * Checksum address string or array of strings to Ethereum checksum format
 * @param originalMethod
 * @param _context
 * @returns
 */
export function ChecksumAddress(
  // biome-ignore lint/suspicious/noExplicitAny: Decorator code
  originalMethod: any,
  _context: ClassMethodDecoratorContext,
) {
  // Define the replacement method that will process the input

  // biome-ignore lint/suspicious/noExplicitAny: Decorator code
  async function replacementMethod(this: DefiProvider, ...args: any[]) {
    const [params] = args

    // A helper function to check and convert a string or an array of strings to checksum format
    function convertToChecksum(value: unknown): unknown {
      if (typeof value === 'string' && isEthereumAddress(value)) {
        try {
          return getAddress(value) // Convert valid Ethereum address to checksum
        } catch (error) {
          throw new Error(`Invalid address format: ${value}`)
        }
      } else if (Array.isArray(value)) {
        return value.map((item) => {
          if (typeof item === 'string' && isEthereumAddress(item)) {
            try {
              return getAddress(item) // Convert each valid address in array to checksum
            } catch (error) {
              throw new Error(`Invalid address format in array: ${item}`)
            }
          }
          return item // Leave non-address items unchanged
        })
      }
      return value // Return unchanged if neither string nor valid Ethereum address
    }

    // Iterate over the parameters and convert where necessary
    for (const key in params) {
      if (params[key]) {
        params[key] = convertToChecksum(params[key])
      }
    }

    // Call the original method with the modified arguments
    return await originalMethod.call(this, ...args)
  }

  return replacementMethod
}
