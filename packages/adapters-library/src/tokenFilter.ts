import type { EvmChain } from './core/constants/chains'

export type DefiPositionDetection = (
  userAddress: string,
  chainId: EvmChain,
) => Promise<
  | {
      contractAddresses: string[]
      tokenIds?: Record<string, string[]> // contractAddress -> metadata values
    }
  | undefined
>
