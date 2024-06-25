import { getAddress } from 'ethers'
import { BeefyVaultV7__factory, SolidlyPool__factory } from '../../contracts'
import { VaultBalanceBreakdownFetcher } from '../types'

export const fetchSolidlyBalanceBreakdown: VaultBalanceBreakdownFetcher =
  async (
    { protocolTokenAddress, underlyingLPTokenAddress, blockSpec },
    provider,
  ) => {
    const vaultContract = BeefyVaultV7__factory.connect(
      protocolTokenAddress,
      provider,
    )
    const poolContract = SolidlyPool__factory.connect(
      underlyingLPTokenAddress,
      provider,
    )

    const [balance, vaultTotalSupply, totalSupply, poolMetadata] =
      await Promise.all([
        vaultContract.balance({ ...blockSpec }),
        vaultContract.totalSupply({ ...blockSpec }),
        poolContract.totalSupply({ ...blockSpec }),
        poolContract.metadata({ ...blockSpec }),
      ])

    const t0 = poolMetadata[5]
    const t1 = poolMetadata[6]
    const r0 = poolMetadata[2]
    const r1 = poolMetadata[3]

    return {
      vaultTotalSupply,
      balances: [
        {
          tokenAddress: getAddress(t0),
          vaultBalance: (r0 * balance) / totalSupply,
        },
        {
          tokenAddress: getAddress(t1),
          vaultBalance: (r1 * balance) / totalSupply,
        },
      ],
    }
  }
