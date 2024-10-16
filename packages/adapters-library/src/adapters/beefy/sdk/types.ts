import type { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider.js'

export enum BeefyProductType {
  COW_TOKEN = 'cow-token',
  MOO_TOKEN = 'moo-token',
  RCOW_TOKEN = 'rcow-token',
  RMOO_TOKEN = 'rmoo-token',
}

export type ApiVault = {
  id: string
  status: 'active' | 'eol'
  earnedTokenAddress: string
  depositTokenAddresses?: string[]
  chain: string
  platformId: ApiPlatformId
  token: string
  tokenAddress: string
  earnedToken: string
  isGovVault?: boolean
  strategyTypeId?: ApiStrategyTypeId
  bridged?: object
  assets?: string[]
}

export type ApiClmManager = {
  id: string
  status: 'active' | 'eol'
  version: number
  platformId: ApiPlatformId
  strategyTypeId?: ApiStrategyTypeId
  chain: string
  type: 'cowcentrated' | 'others'
  tokenAddress: string // underlying pool address
  depositTokenAddresses: string[] // token0 and token1
  earnContractAddress: string // reward pool address
  earnedTokenAddress: string // clm manager address
}

export type ApiClmRewardPool = {
  id: string
  status: 'active' | 'eol'
  version: number
  platformId: ApiPlatformId
  strategyTypeId?: ApiStrategyTypeId
  chain: string
  tokenAddress: string // clm address (want)
  earnContractAddress: string // reward pool address
  earnedTokenAddresses: string[] // reward tokens
}

export type ApiGovVault = {
  id: string
  status: 'active' | 'eol'
  version: number
  chain: string
  tokenAddress: string // clm address
  earnContractAddress: string // reward pool address
  earnedTokenAddresses: string[]
}

export type ApiBoost = {
  id: string
  poolId: string

  version: number
  chain: string
  status: 'active' | 'eol'

  tokenAddress: string // underlying
  earnedTokenAddress: string // reward token address
  earnContractAddress: string // reward pool address
}

export type ProtocolUnwrapType =
  | 'balancer_aura_lp'
  | 'balancer_aura_multi_lp'
  | 'balancer_aura_multi_lp_locked'
  | 'curve'
  | 'gamma'
  | 'ichi'
  | 'aave_lend'
  | 'pendle_equilibria'
  | 'solidly'
  | 'beefy_clm'

export type ApiStrategyTypeId =
  | 'lp'
  | 'multi-lp'
  | 'multi-lp-locked'
  | 'cowcentrated'

export type ApiPlatformId =
  | 'aave'
  | 'aerodrome'
  | 'aura'
  | 'curve'
  | 'equilibria'
  | 'gamma'
  | 'ichi'
  | 'lynex'
  | 'mendi'
  | 'nile'
  | 'velodrome'
  | 'beefy'

export type BalanceBreakdown = {
  vaultTotalSupply: bigint
  balances: {
    tokenAddress: string
    vaultBalance: bigint
  }[]
}

export type VaultBalanceBreakdownFetcher = (
  input: {
    protocolTokenAddress: string
    underlyingLPTokenAddress: string
    blockSpec: { blockTag: number | undefined }
  },
  provider: CustomJsonRpcProvider,
) => Promise<BalanceBreakdown>
