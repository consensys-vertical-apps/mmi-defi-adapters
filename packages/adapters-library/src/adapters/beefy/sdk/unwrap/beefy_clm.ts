import { getAddress } from 'ethers'
import { BeefyVaultConcLiq__factory } from '../../contracts'
import { VaultBalanceBreakdownFetcher } from '../types'

export const fetchBeefyClmBalanceBreakdown: VaultBalanceBreakdownFetcher =
  async ({ underlyingLPTokenAddress, blockSpec }, provider) => {
    const clmContract = BeefyVaultConcLiq__factory.connect(
      underlyingLPTokenAddress,
      provider,
    )

    const [balances, vaultTotalSupply, wants] = await Promise.all([
      clmContract.balances({ ...blockSpec }),
      clmContract.totalSupply({ ...blockSpec }),
      clmContract.wants({ ...blockSpec }),
    ])

    return {
      vaultTotalSupply,
      balances: [
        {
          tokenAddress: getAddress(wants[0]),
          vaultBalance: balances[0],
        },
        {
          tokenAddress: getAddress(wants[1]),
          vaultBalance: balances[1],
        },
      ],
    }
  }
