import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

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

  {
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: '0x38989BBA00BDF8181F4082995b3DEAe96163aC5D',
      timePeriod: TimePeriod.oneDay,

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

    blockNumber: 20633660,
    key: '3',
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
    key: '6',
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
    key: '7',
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
    key: '8',
  },
  {
    chainId: Chain.Base,
    method: 'withdrawals',
    input: {
      userAddress: '0xD4f9FE0039Da59e6DDb21bbb6E84e0C9e83D73eD',
      fromBlock: 17605195 - 1,
      toBlock: 17605195 + 1,
      protocolTokenAddress: '0xbeef010f9cb27031ad51e3333f9af9c6b1228183',
      productId: 'vault',
    },
    key: '9',
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
    key: '10',
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xDA44D84f8DE69fEBDa4C4e0B89fF24077413f4b0',
      filterProtocolTokens: ['0xd63070114470f685b75B74D60EEc7c1113d33a3D'], // Usual vault
    },
    blockNumber: 20417741, // Choose a recent block number
    key: '11',
  },
  {
    chainId: Chain.Base,
    method: 'positions',
    input: {
      userAddress: '0x7C818D46ACEf870ea88137BF553594f4803872cA',
      filterProtocolTokens: ['0xa0e430870c4604ccfc7b38ca7845b1ff653d0ff1'], // mwETH Vault
    },
    blockNumber: 17776788, // Choose a recent block number
    key: '12',
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0xDA44D84f8DE69fEBDa4C4e0B89fF24077413f4b0',
      fromBlock: 20417740,
      toBlock: 20417745,
      protocolTokenAddress: '0xd63070114470f685b75B74D60EEc7c1113d33a3D', // Usual vault
      productId: 'vault',
    },
    key: '13',
  },
  {
    chainId: Chain.Base,
    method: 'deposits',
    input: {
      userAddress: '0x7C818D46ACEf870ea88137BF553594f4803872cA',
      fromBlock: 17776688,
      toBlock: 17778933,
      protocolTokenAddress: '0xa0e430870c4604ccfc7b38ca7845b1ff653d0ff1', // mwETH Vault
      productId: 'vault',
    },
    key: '14',
  },
]
