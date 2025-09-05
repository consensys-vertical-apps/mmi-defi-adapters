/**
 * User address transformation functions
 * These functions convert raw event data to actual user addresses
 */

export type UserAddressTransformer = (rawValue: string) => string | null

export const USER_ADDRESS_TRANSFORMERS: Record<string, UserAddressTransformer> =
  {
    /**
     * Extract address from ETH2 withdrawal credentials
     * Format: 0x010000000000000000000000F5E128551D45F7BAEADB6C7F0DAA17CB9678BA41
     * The first 12 bytes are zeros, the last 20 bytes are the withdrawal address
     */
    'eth2-withdrawal-credentials': (withdrawalCredentials: string) => {
      // Remove 0x prefix and take the last 40 characters (20 bytes * 2 hex chars per byte)
      const hex = withdrawalCredentials.startsWith('0x')
        ? withdrawalCredentials.slice(2)
        : withdrawalCredentials

      // Check if this is BLS withdrawal credentials (starts with 00)
      if (hex.startsWith('00')) {
        // Return a dummy address for BLS credentials
        // We can use this to periodically check if the BLS credentials have been updated
        return '0x000000000000000000000000000000000000faff'
      }

      // Extract the last 20 bytes (40 hex characters) which represent the address
      const addressHex = hex.slice(-40)

      // Add 0x prefix back
      return `0x${addressHex.toLowerCase()}`
    },
  }

export function getUserAddressTransformer(
  transformType?: string,
): UserAddressTransformer | undefined {
  if (!transformType) {
    return undefined
  }

  return USER_ADDRESS_TRANSFORMERS[transformType]
}
