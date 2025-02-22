import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x38989BBA00BDF8181F4082995b3DEAe96163aC5D',

      filterProtocolTokens: [
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      ],

      filterTokenIds: [
        '0x58e212060645d18eab6d9b2af3d56fbc906a92ff5667385f616f662c70372284',
        '0x3c83f77bde9541f8d3d82533b19bbc1f97eb2f1098bb991728acbfbede09cc5d',
        '0xd0e50cdac92fe2172043f5e0c36532c6369d24947e40968f34a5e8819ca9ec5d',
        '0x138eec0e4a1937eb92ebc70043ed539661dd7ed5a89fb92a720b341650288a40',
      ],
    },

    blockNumber: 20633609,
    key: '1',
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x9CBF099ff424979439dFBa03F00B5961784c06ce',

      filterProtocolTokens: [
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      ],

      filterTokenIds: [
        '0xc54d7acf14de29e0e5527cabd7a576506870346a78a11a6762e2cca66322ec41',
        '0xb323495f7e4148be5643a4ea4a8221eef163e4bccfdedc2a6f4696baacbc86cc',
        '0xa921ef34e2fc7a27ccc50ae7e4b154e16c9799d3387076c421423ef52ac4df99',
        '0x3a85e619751152991742810df6ec69ce473daef99e28a64ab2340d7b7ccfee49',
        '0x49bb2d114be9041a787432952927f6f144f05ad3e83196a7d062f374ee11d0ee',
      ],
    },
    key: '2',
    blockNumber: 19425631,
  },
]
