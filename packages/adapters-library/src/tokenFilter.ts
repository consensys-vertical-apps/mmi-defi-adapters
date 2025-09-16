import type { EvmChain } from './core/constants/chains'

/**
 *
 * This function is responsible for querying the database to find:
 * - Contract addresses where the user has positions
 * - Associated metadata for each contract (e.g., token IDs, validator pubkeys)
 *
 * @param userAddress - The user's address to query positions for
 * @param chainId - The chain to query positions on
 * @returns Promise resolving to position data or undefined if no positions found
 *
 * @property contractAddresses - Array of contract addresses where user has positions
 * @property positionMetadataByContractAddress - Maps contract address to array of metadata values
 *   - For ETH2 staking: maps to validator pubkeys
 *   - For Uniswap V4: maps to token IDs
 *   - For other protocols: maps to whatever metadata was extracted from events
 */
export type DefiPositionDetection = (
  userAddress: string,
  chainId: EvmChain,
) => Promise<
  | {
      contractAddresses: string[]
      positionMetadataByContractAddress?: Record<string, string[]> // contractAddress -> metadata values
    }
  | undefined
>
