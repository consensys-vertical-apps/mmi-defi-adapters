import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'
import { TokenAddresses } from '../products/solv-btc/config'

const User1 = '0x7BFEe91193d9Df2Ac0bFe90191D40F23c773C060' // Has some SolvBTC on Arbitrum
const User2 = '0xEBFAEEDE1D85E8E87BDe9326bc301830D55dfa8c' // Has some SolvBTC.BBN on Mainnet
const User3 = '0x423e5E0ee2615E6bef4B181400553066dAE3b6fD' // Has some SolvBTC.ENA on BSC
const User4 = '0xd87D6D2D766b15cDA45e3cACC8742104B5A921ea' // Has deposited + withdrew some SolvBTC over a few days

const buildTestCase = (
  chainId: Chain,
  method: 'positions' | 'profits',
  address: string,
  blockNumber: number,
) => ({
  chainId,
  method,
  input: {
    userAddress: address,
    filterProtocolTokens: TokenAddresses[chainId]!.map(
      (tokenInfo) => tokenInfo.protocolToken,
    ),
  },
  blockNumber,
})

export const testCases: TestCase[] = [
  buildTestCase(Chain.Arbitrum, 'positions', User1, 243427727),
  buildTestCase(Chain.Ethereum, 'positions', User2, 20540389),
  buildTestCase(Chain.Bsc, 'positions', User3, 41410339),
  buildTestCase(Chain.Arbitrum, 'profits', User4, 243427777),
]
