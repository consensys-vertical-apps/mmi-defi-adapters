import { getAddress } from 'ethers'
import { BeefyVaultV7__factory, IchiAlm__factory } from '../../contracts'
import { VaultBalanceBreakdownFetcher } from '../types'

export const fetchIchiBalanceBreakdown: VaultBalanceBreakdownFetcher = async (
  { protocolTokenAddress, underlyingLPTokenAddress, blockSpec },
  provider,
) => {
  const vaultContract = BeefyVaultV7__factory.connect(
    protocolTokenAddress,
    provider,
  )

  const almContract = IchiAlm__factory.connect(
    underlyingLPTokenAddress,
    provider,
  )

  const [
    balance,
    vaultTotalSupply,
    totalSupply,
    basePosition,
    limitPosition,
    token0,
    token1,
  ] = await Promise.all([
    vaultContract.balance({ ...blockSpec }),
    vaultContract.totalSupply({ ...blockSpec }),
    almContract.totalSupply({ ...blockSpec }),
    almContract.getBasePosition({ ...blockSpec }),
    almContract.getLimitPosition({ ...blockSpec }),
    almContract.token0({ ...blockSpec }),
    almContract.token1({ ...blockSpec }),
  ])

  const position0 = basePosition.amount0 + limitPosition.amount0
  const position1 = basePosition.amount1 + limitPosition.amount1

  return {
    vaultTotalSupply,
    balances: [
      {
        tokenAddress: getAddress(token0),
        vaultBalance: (position0 * balance) / totalSupply,
      },
      {
        tokenAddress: getAddress(token1),
        vaultBalance: (position1 * balance) / totalSupply,
      },
    ],
  }
}
