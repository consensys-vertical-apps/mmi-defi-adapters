import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Optimism,
    method: 'positions',

    input: {
      userAddress: '0xaA62CF7caaf0c7E50Deaa9d5D0b907472F00B258',

      filterProtocolTokens: [
        '0xf7B5965f5C117Eb1B5450187c9DcFccc3C317e8E',
        '0x8cD6b19A07d754bF36AdEEE79EDF4F2134a8F571',
        '0xD7dAabd899D1fAbbC3A9ac162568939CEc0393Cc',
        '0x33865E09A572d4F1CC4d75Afc9ABcc5D3d4d867D',
        '0x26AaB17f27CD1c8d06a0Ad8E4a1Af8B1032171d5',
        '0xEC8FEa79026FfEd168cCf5C627c7f486D77b765F',
        '0xAFdf91f120DEC93c65fd63DBD5ec372e5dcA5f82',
        '0xd14451E0Fa44B18f08aeB1E4a4d092B823CaCa68',
        '0x1AfD1fF9E441973B7D34c7B8AbE91d94F1B23ce0',
      ],
    },

    blockNumber: 119518821,
  },
  {
    chainId: Chain.Optimism,
    method: 'profits',

    input: {
      userAddress: '0xaA62CF7caaf0c7E50Deaa9d5D0b907472F00B258',
      timePeriod: TimePeriod.oneDay,

      filterProtocolTokens: [
        '0xf7B5965f5C117Eb1B5450187c9DcFccc3C317e8E',
        '0x8cD6b19A07d754bF36AdEEE79EDF4F2134a8F571',
        '0xD7dAabd899D1fAbbC3A9ac162568939CEc0393Cc',
        '0x33865E09A572d4F1CC4d75Afc9ABcc5D3d4d867D',
        '0x26AaB17f27CD1c8d06a0Ad8E4a1Af8B1032171d5',
        '0xEC8FEa79026FfEd168cCf5C627c7f486D77b765F',
        '0xAFdf91f120DEC93c65fd63DBD5ec372e5dcA5f82',
        '0xd14451E0Fa44B18f08aeB1E4a4d092B823CaCa68',
        '0x1AfD1fF9E441973B7D34c7B8AbE91d94F1B23ce0',
      ],
    },

    blockNumber: 119518821,
  },
  {
    chainId: Chain.Optimism,
    method: 'tvl',

    filterProtocolTokens: ['0xf7B5965f5C117Eb1B5450187c9DcFccc3C317e8E'],

    blockNumber: 119518821,
  },
]
