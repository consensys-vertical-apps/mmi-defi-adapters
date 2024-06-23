import { getAddress } from 'ethers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import {
  BalancerPool__factory,
  BalancerVault__factory,
  BeefyVaultV7__factory,
} from '../../contracts'
import { VaultBalanceBreakdownFetcher } from '../types'

export const fetchBalancerAuraBalanceLPBreakdown: VaultBalanceBreakdownFetcher =
  async (input, provider) =>
    fetchBalancerAuraBalanceBreakdown(input, provider, 'lp')

export const fetchBalancerAuraBalanceMultiLPBreakdown: VaultBalanceBreakdownFetcher =
  async (input, provider) =>
    fetchBalancerAuraBalanceBreakdown(input, provider, 'multi-lp')

export const fetchBalancerAuraBalanceMultiLPLockedBreakdown: VaultBalanceBreakdownFetcher =
  async (input, provider) =>
    fetchBalancerAuraBalanceBreakdown(input, provider, 'multi-lp-locked')

const fetchBalancerAuraBalanceBreakdown = async (
  {
    protocolTokenAddress,
    underlyingLPTokenAddress,
    blockSpec,
  }: Parameters<VaultBalanceBreakdownFetcher>[0],
  provider: CustomJsonRpcProvider,
  mode: 'lp' | 'multi-lp' | 'multi-lp-locked',
) => {
  const vaultContract = BeefyVaultV7__factory.connect(
    protocolTokenAddress,
    provider,
  )

  const balancerPoolContract = BalancerPool__factory.connect(
    underlyingLPTokenAddress,
    provider,
  )

  const [
    balance,
    vaultTotalSupply,
    balancerVaultAddress,
    balancerPoolId,
    balancerTotalSupply,
  ] = await Promise.all([
    vaultContract.balance({ ...blockSpec }),
    vaultContract.totalSupply({ ...blockSpec }),
    balancerPoolContract.getVault({ ...blockSpec }),
    balancerPoolContract.getPoolId({ ...blockSpec }),
    mode === 'lp' || mode === 'multi-lp-locked'
      ? balancerPoolContract.getActualSupply({ ...blockSpec })
      : balancerPoolContract.totalSupply({ ...blockSpec }),
  ])

  const balancerVaultContract = BalancerVault__factory.connect(
    balancerVaultAddress,
    provider,
  )

  const poolTokensRes = await balancerVaultContract.getPoolTokens(
    balancerPoolId,
    { ...blockSpec },
  )
  const poolTokens = poolTokensRes[0]
  const poolBalances = poolTokensRes[1]

  return {
    vaultTotalSupply,
    balances: poolTokens.map((token, i) => ({
      tokenAddress: getAddress(token),
      vaultBalance: ((poolBalances[i] || 0n) * balance) / balancerTotalSupply,
    })),
  }
}
