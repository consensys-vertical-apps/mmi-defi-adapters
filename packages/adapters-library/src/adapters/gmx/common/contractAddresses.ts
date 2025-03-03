import { getAddress } from 'ethers'
import { Chain } from '../../../core/constants/chains.js'

export const contractAddresses: Partial<
  Record<
    Chain,
    {
      rewardRouter: string
      glpRewardRouter: string
    }
  >
> = {
  [Chain.Arbitrum]: {
    rewardRouter: getAddress('0x5e4766f932ce00aa4a1a82d3da85adf15c5694a1'),
    glpRewardRouter: getAddress('0xB95DB5B167D75e6d04227CfFFA61069348d271F5'),
  },
  [Chain.Avalanche]: {
    rewardRouter: getAddress('0x091eD806490Cc58Fd514441499e58984cCce0630'),
    glpRewardRouter: getAddress('0xB70B91CE0771d3f4c81D87660f71Da31d48eB3B3'),
  },
}
