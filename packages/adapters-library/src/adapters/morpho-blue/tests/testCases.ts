import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x38989BBA00BDF8181F4082995b3DEAe96163aC5D',
      filterProtocolTokens: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
      filterTokenIds: [
        '0xc54d7acf14de29e0e5527cabd7a576506870346a78a11a6762e2cca66322ec41',
      ],
    },
    blockNumber: 19425631,
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

  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0x38989BBA00BDF8181F4082995b3DEAe96163aC5D',
      timePeriod: TimePeriod.oneDay,
      includeRawValues: true,
      filterProtocolTokens: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
      filterTokenIds: [
        '0xc54d7acf14de29e0e5527cabd7a576506870346a78a11a6762e2cca66322ec41',
      ],
    },
    blockNumber: 19220228 + 1,
  },
  {
    // TODO Check results
    chainId: Chain.Ethereum,
    method: 'tvl',
    filterProtocolTokens: [
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    ],
    blockNumber: 19661885,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB',
      fromBlock: 19339143 - 1,
      toBlock: 19339143 + 1,
      protocolTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      tokenId:
        '0xB323495F7E4148BE5643A4EA4A8221EEF163E4BCCFDEDC2A6F4696BAACBC86CC',
      productId: 'market-supply',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'borrows',
    input: {
      userAddress: '0x8FB1e48d47301fe6D506192B036dD25e17Aca273',
      fromBlock: 19338914 - 1,
      toBlock: 19338914 + 1,
      protocolTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      tokenId:
        '0xc54d7acf14de29e0e5527cabd7a576506870346a78a11a6762e2cca66322ec41',
      productId: 'market-borrow',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      userAddress: '0x8FB1e48d47301fe6D506192B036dD25e17Aca273',
      fromBlock: 19338887 - 1,
      toBlock: 19338887 + 1,
      protocolTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      tokenId:
        '0xC54D7ACF14DE29E0E5527CABD7A576506870346A78A11A6762E2CCA66322EC41',
      productId: 'market-supply',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'repays',
    input: {
      userAddress: '0x357dfdC34F93388059D2eb09996d80F233037cBa',
      fromBlock: 19338885 - 1,
      toBlock: 19338885 + 1,
      protocolTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      tokenId:
        '0x698fe98247a40c5771537b5786b2f3f9d78eb487b4ce4d75533cd0e94d88a115',
      productId: 'market-borrow',
    },
  },
]
