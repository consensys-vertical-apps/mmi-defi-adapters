import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'
import { DOT_VAULT } from '../dotStakingAdapter'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Base,
    method: 'positions',
    key: 'stake-event-discovery',
    blockNumber: 52435010,
    input: {
      userAddress: '0x5D00253248262e78eAFE1f11a510E73B0BE2D4AC',
      filterProtocolTokens: [DOT_VAULT],
      openingPositionTxHash:
        '0x64a903361c9a59cdfcfe825a5a4927aafab00d6da9d3b0476e6eeea909bc6239',
    },
  },
  {
    chainId: Chain.Base,
    method: 'positions',
    key: 'active-stake',
    blockNumber: 52435010,
    input: {
      userAddress: '0x34d8dd4a7fb90a545214d2aa47951eecce16839c',
      filterProtocolTokens: [DOT_VAULT],
    },
  },
  {
    chainId: Chain.Base,
    method: 'positions',
    key: 'pending-withdrawal-only',
    blockNumber: 52435010,
    input: {
      userAddress: '0x4c110e1d6dd23372185dfe4c61978c2ae8d35233',
      filterProtocolTokens: [DOT_VAULT],
    },
  },
  {
    chainId: Chain.Base,
    method: 'positions',
    key: 'empty-wallet',
    blockNumber: 52435010,
    input: {
      userAddress: '0x0000000000000000000000000000000000000000',
      filterProtocolTokens: [DOT_VAULT],
    },
  },
  {
    chainId: Chain.Base,
    method: 'positions',
    key: 'before-deployment',
    blockNumber: 52348945,
    input: {
      userAddress: '0x34d8dd4a7fb90a545214d2aa47951eecce16839c',
      filterProtocolTokens: [DOT_VAULT],
    },
  },
  {
    chainId: Chain.Base,
    method: 'prices',
    key: 'one-dot-per-unit',
    blockNumber: 52435010,
    filterProtocolToken: DOT_VAULT,
  },
]
