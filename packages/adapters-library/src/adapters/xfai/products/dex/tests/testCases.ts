import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',
    input: {
      userAddress: '0x1D3DC4b584bc687fB3C9AdC1761858694728B1b3',

      filterProtocolTokens: [
        '0x101c6e1e717f13fb351C0B51FFaa8839034F474D',
        '0xB694ce4c96fb60DB5ad8b25dfF567c59f7a49a4E',
        '0xabBe925Cf6913A5af177Fb735dd817b02da0883f',
        '0x2c8852Fa100f712341Ce2213bc02456C077Bf263',
        '0xb477d53aad75E1DF767C09507DAB2aD98C506A24',
        '0x122eeA08C5709004D5994bDF817eB72caf2a7701',
        '0x65a68da6E532B6Ccb29b6F61aFd792B6672864C1',
      ],
    },
    blockNumber: 2584657,
  },
  {
    chainId: Chain.Linea,
    method: 'prices',
    filterProtocolToken: '0xB694ce4c96fb60DB5ad8b25dfF567c59f7a49a4E',
    blockNumber: 3717681,
  },
]
