import { Chain } from '../../../core/constants/chains.js'
import type {
  ApiPlatformId,
  ApiStrategyTypeId,
  ProtocolUnwrapType,
  VaultBalanceBreakdownFetcher,
} from './types.js'
import { fetchAaveLendBalanceBreakdown } from './unwrap/aave_lend.js'
import {
  fetchBalancerAuraBalanceLPBreakdown,
  fetchBalancerAuraBalanceMultiLPBreakdown,
  fetchBalancerAuraBalanceMultiLPLockedBreakdown,
} from './unwrap/balancer_aura.js'
import { fetchBeefyClmBalanceBreakdown } from './unwrap/beefy_clm.js'
import { fetchCurveBalanceBreakdown } from './unwrap/curve.js'
import { fetchGammaBalanceBreakdown } from './unwrap/gamma.js'
import { fetchIchiBalanceBreakdown } from './unwrap/ichi.js'
import { fetchPendleEquilibriaBalanceBreakdown } from './unwrap/pendle_equilibria.js'
import { fetchSolidlyBalanceBreakdown } from './unwrap/solidly.js'

export const chainIdMap: Partial<Record<Chain, string>> = {
  [Chain.Arbitrum]: 'arbitrum',
  [Chain.Avalanche]: 'avax',
  [Chain.Base]: 'base',
  [Chain.Bsc]: 'bsc',
  [Chain.Ethereum]: 'ethereum',
  [Chain.Fantom]: 'fantom',
  [Chain.Linea]: 'linea',
  [Chain.Optimism]: 'optimism',
  [Chain.Polygon]: 'polygon',
}

export const protocolMap: Record<
  ApiPlatformId,
  | Partial<Record<ApiStrategyTypeId | 'default', ProtocolUnwrapType>>
  | ProtocolUnwrapType
> = {
  aave: 'aave_lend',
  aerodrome: 'solidly',
  aura: {
    default: 'balancer_aura_lp',
    lp: 'balancer_aura_lp',
    'multi-lp': 'balancer_aura_multi_lp',
    'multi-lp-locked': 'balancer_aura_multi_lp_locked',
  },
  beefy: {
    default: 'beefy_clm',
    cowcentrated: 'beefy_clm',
  },
  curve: 'curve',
  equilibria: 'pendle_equilibria',
  gamma: 'gamma',
  ichi: 'ichi',
  lynex: 'solidly',
  mendi: 'aave_lend',
  nile: 'solidly',
  velodrome: 'solidly',
}

export const breakdownFetcherMap: Record<
  ProtocolUnwrapType,
  VaultBalanceBreakdownFetcher
> = {
  curve: fetchCurveBalanceBreakdown,
  aave_lend: fetchAaveLendBalanceBreakdown,
  balancer_aura_lp: fetchBalancerAuraBalanceLPBreakdown,
  balancer_aura_multi_lp: fetchBalancerAuraBalanceMultiLPBreakdown,
  balancer_aura_multi_lp_locked: fetchBalancerAuraBalanceMultiLPLockedBreakdown,
  gamma: fetchGammaBalanceBreakdown,
  ichi: fetchIchiBalanceBreakdown,
  pendle_equilibria: fetchPendleEquilibriaBalanceBreakdown,
  solidly: fetchSolidlyBalanceBreakdown,
  beefy_clm: fetchBeefyClmBalanceBreakdown,
}
