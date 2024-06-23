import { BeefyVaultV7__factory } from '../../contracts'
import { VaultBalanceBreakdownFetcher } from '../types'

export const fetchAaveLendBalanceBreakdown: VaultBalanceBreakdownFetcher =
  async (
    { protocolTokenAddress, underlyingLPTokenAddress, blockSpec },
    provider,
  ) => {
    const vaultContract = BeefyVaultV7__factory.connect(
      protocolTokenAddress,
      provider,
    )

    const [balance, vaultTotalSupply] = await Promise.all([
      vaultContract.balance({ ...blockSpec }),
      vaultContract.totalSupply({ ...blockSpec }),
    ])

    return {
      vaultTotalSupply,
      balances: [
        {
          tokenAddress: underlyingLPTokenAddress,
          vaultBalance: balance,
        },
      ],
    }
  }
