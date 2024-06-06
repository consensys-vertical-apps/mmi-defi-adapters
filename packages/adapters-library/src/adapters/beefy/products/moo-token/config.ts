import { Chain } from '../../../../core/constants/chains'
import {
  ApiPlatformId,
  ApiStrategyTypeId,
  ProtocolUnwrapType,
  VaultBalanceBreakdownFetcher,
} from './types'
import { fetchAaveLendBalanceBreakdown } from './unwrap/aave_lend'
import {
  fetchBalancerAuraBalanceLPBreakdown,
  fetchBalancerAuraBalanceMultiLPBreakdown,
  fetchBalancerAuraBalanceMultiLPLockedBreakdown,
} from './unwrap/balancer_aura'
import { fetchCurveBalanceBreakdown } from './unwrap/curve'
import { fetchGammaBalanceBreakdown } from './unwrap/gamma'
import { fetchIchiBalanceBreakdown } from './unwrap/ichi'
import { fetchPendleEquilibriaBalanceBreakdown } from './unwrap/pendle_equilibria'
import { fetchSolidlyBalanceBreakdown } from './unwrap/solidly'

export const chainIdMap: Record<Chain, string> = {
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
  Record<ApiStrategyTypeId | 'default', ProtocolUnwrapType> | ProtocolUnwrapType
> = {
  aave: 'aave_lend',
  aerodrome: 'solidly',
  aura: {
    default: 'balancer_aura_lp',
    lp: 'balancer_aura_lp',
    'multi-lp': 'balancer_aura_multi_lp',
    'multi-lp-locked': 'balancer_aura_multi_lp_locked',
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
}
