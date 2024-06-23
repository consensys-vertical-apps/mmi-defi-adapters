import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'

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
export type ApiBoost = {
  id: string
  poolId: string
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
