import { getAddress } from 'ethers'
import {
  BeefyVaultV7__factory,
  CurvePool__factory,
  CurveToken__factory,
} from '../../contracts'
import { VaultBalanceBreakdownFetcher } from '../types'

export const fetchCurveBalanceBreakdown: VaultBalanceBreakdownFetcher = async (
  { protocolTokenAddress, underlyingLPTokenAddress, blockSpec },
  provider,
) => {
  const vaultContract = BeefyVaultV7__factory.connect(
    protocolTokenAddress,
    provider,
  )

  const curveTokenContract = CurveToken__factory.connect(
    underlyingLPTokenAddress,
    provider,
  )
  const curvePoolContract = CurvePool__factory.connect(
    underlyingLPTokenAddress,
    provider,
  )

  const [balance, vaultTotalSupply, totalSupply] = await Promise.all([
    vaultContract.balance({ ...blockSpec }),
    vaultContract.totalSupply({ ...blockSpec }),
    curveTokenContract.totalSupply({ ...blockSpec }),
  ])
  const coins: string[] = await Promise.all([
    curvePoolContract.coins(0n, { ...blockSpec }),
    curvePoolContract.coins(1n, { ...blockSpec }), // always at least 2 coins
  ])

  for (let i = 2; i < 8; ++i) {
    try {
      const nextCoin = await curvePoolContract.coins(i, { ...blockSpec })
      coins.push(nextCoin)
    } catch (e) {
      break
    }
  }

  const reserves = await Promise.all(
    coins.map((_, i) => curvePoolContract.balances(i, { ...blockSpec })),
  )

  return {
    vaultTotalSupply,
    balances: coins.map((coin, i) => ({
      tokenAddress: getAddress(coin),
      vaultBalance: ((reserves[i] || 0n) * balance) / totalSupply,
    })),
  }
}
