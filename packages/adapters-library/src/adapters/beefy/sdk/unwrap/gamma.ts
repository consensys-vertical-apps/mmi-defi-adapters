import { getAddress } from 'ethers'
import {
  BeefyVaultV7__factory,
  GammaHypervisor__factory,
} from '../../contracts'
import { VaultBalanceBreakdownFetcher } from '../types'

export const fetchGammaBalanceBreakdown: VaultBalanceBreakdownFetcher = async (
  { protocolTokenAddress, underlyingLPTokenAddress, blockSpec },
  provider,
) => {
  const vaultContract = BeefyVaultV7__factory.connect(
    protocolTokenAddress,
    provider,
  )

  const hypervisorContract = GammaHypervisor__factory.connect(
    underlyingLPTokenAddress,
    provider,
  )

  const [balance, vaultTotalSupply, totalSupply, totalAmounts, token0, token1] =
    await Promise.all([
      vaultContract.balance({ ...blockSpec }),
      vaultContract.totalSupply({ ...blockSpec }),
      hypervisorContract.totalSupply({ ...blockSpec }),
      hypervisorContract.getTotalAmounts({ ...blockSpec }),
      hypervisorContract.token0({ ...blockSpec }),
      hypervisorContract.token1({ ...blockSpec }),
    ])

  return {
    vaultTotalSupply,
    balances: [
      {
        tokenAddress: getAddress(token0),
        vaultBalance: (totalAmounts[0] * balance) / totalSupply,
      },
      {
        tokenAddress: getAddress(token1),
        vaultBalance: (totalAmounts[1] * balance) / totalSupply,
      },
    ],
  }
}
