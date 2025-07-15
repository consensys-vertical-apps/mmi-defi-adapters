import type { EvmChain } from './core/constants/chains'

export type PoolFilter = (
  userAddress: string,
  chainId: EvmChain,
) => Promise<string[] | undefined>
