export function testCases() {
  return `
import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'positions',
  //   input: {
  //     userAddress: '0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255',
  //   },
  //   blockNumber: 18163124,
  // },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'profits',
  //   input: {
  //     userAddress: '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b',
  //     timePeriod: TimePeriod.oneDay,
  //   },
  //   blockNumber: 18163965,
  // },
]
`
}
