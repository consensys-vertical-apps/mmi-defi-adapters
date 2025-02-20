export function testCases() {
  return `
import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'positions',
  //   input: {
  //     userAddress: '0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255',
  //   },
  // },
]
`
}
