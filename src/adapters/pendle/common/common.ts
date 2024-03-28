export const PendleChain = {
  Ethereum: 1,
  Optimism: 10,
  Bsc: 56,
  Arbitrum: 42161,
} as const
export type PendleChain = (typeof PendleChain)[keyof typeof PendleChain]
