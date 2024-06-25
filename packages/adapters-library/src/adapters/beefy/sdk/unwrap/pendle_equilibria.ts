import { getAddress } from 'ethers'
import {
  BeefyVaultV7__factory,
  PendleMarket__factory,
  PendleSyToken__factory,
} from '../../contracts'
import { VaultBalanceBreakdownFetcher } from '../types'

const PENDLE_ROUTER_ADDRESS_ARBITRUM = getAddress(
  '0x00000000005BBB0EF59571E58418F9a4357b68A0',
)

export const fetchPendleEquilibriaBalanceBreakdown: VaultBalanceBreakdownFetcher =
  async (
    { protocolTokenAddress, underlyingLPTokenAddress, blockSpec },
    provider,
  ) => {
    const vaultContract = BeefyVaultV7__factory.connect(
      protocolTokenAddress,
      provider,
    )
    const pendleMarketContract = PendleMarket__factory.connect(
      underlyingLPTokenAddress,
      provider,
    )

    const [balance, vaultTotalSupply, tokenAddresses, pendleState] =
      await Promise.all([
        vaultContract.balance({ ...blockSpec }),
        vaultContract.totalSupply({ ...blockSpec }),
        pendleMarketContract.readTokens({ ...blockSpec }),
        pendleMarketContract.readState(PENDLE_ROUTER_ADDRESS_ARBITRUM, {
          ...blockSpec,
        }),
      ])

    const syTokenContract = PendleSyToken__factory.connect(
      tokenAddresses[0],
      provider,
    )

    const syUnderlyingAddress = await syTokenContract.yieldToken({
      ...blockSpec,
    })

    return {
      vaultTotalSupply: vaultTotalSupply,
      balances: [
        {
          tokenAddress: getAddress(syUnderlyingAddress),
          vaultBalance: (pendleState.totalSy * balance) / pendleState.totalLp,
        },
      ],
    }
  }
