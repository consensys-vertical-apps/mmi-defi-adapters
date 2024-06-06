import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { Erc20Metadata } from '../../../../types/erc20Metadata'

export type MetadataEntry = {
  protocolToken: Erc20Metadata
  underlyingTokens: Erc20Metadata[]
  unwrapType: ProtocolUnwrapType
  underlyingLPToken: Erc20Metadata
}

export type Metadata = Record<string, MetadataEntry>

export type ApiVault = {
  id: string
  status: 'active' | 'eol'
  earnedTokenAddress: string
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

export type ApiStrategyTypeId = 'lp' | 'multi-lp' | 'multi-lp-locked'

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
