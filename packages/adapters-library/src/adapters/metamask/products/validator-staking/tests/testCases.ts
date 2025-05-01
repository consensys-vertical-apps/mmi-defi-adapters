import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

// Validator Staking Adapter uses API which has no block number param
// Therefore we cannot have a snapshot test case for it
// Keeping test file for future reference

export const testCases: TestCase[] = [
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'positions',
  //   input: {
  //     userAddress: '0x871cA3e839e1ca27d66f618791b162A5e1aAB3a0',
  //   },
  //   blockNumber: 18733080,
  // },
]
