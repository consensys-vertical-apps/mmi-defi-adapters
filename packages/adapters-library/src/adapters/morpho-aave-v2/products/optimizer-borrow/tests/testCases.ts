import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x4C09DD7c598b12c781C4B5d74D245a1784a2E148',

      filterProtocolTokens: [
        '0x030bA81f1c18d280636F32af80b9AAd02Cf0854e',
        '0xBcca60bB61934080951369a648Fb03DF4F96263C',
        '0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811',
      ],
    },
    blockNumber: 18733080,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    key: '1',
    input: {
      userAddress: '0x4C09DD7c598b12c781C4B5d74D245a1784a2E148',
      timePeriod: TimePeriod.oneDay,
      includeRawValues: true,

      filterProtocolTokens: [
        '0x030bA81f1c18d280636F32af80b9AAd02Cf0854e',
        '0xBcca60bB61934080951369a648Fb03DF4F96263C',
        '0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811',
      ],
    },
    blockNumber: 19187226 + 1,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    key: '2',
    input: {
      userAddress: '0x4C09DD7c598b12c781C4B5d74D245a1784a2E148',
      timePeriod: TimePeriod.oneDay,
      includeRawValues: true,

      filterProtocolTokens: [
        '0x030bA81f1c18d280636F32af80b9AAd02Cf0854e',
        '0xBcca60bB61934080951369a648Fb03DF4F96263C',
        '0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811',
      ],
    },
    blockNumber: 19070103 + 1,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0x4C09DD7c598b12c781C4B5d74D245a1784a2E148',
      fromBlock: 19066622 - 1,
      toBlock: 19066622 + 1,
      protocolTokenAddress: '0xBcca60bB61934080951369a648Fb03DF4F96263C',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'repays',
    input: {
      userAddress: '0x4C09DD7c598b12c781C4B5d74D245a1784a2E148',
      fromBlock: 18981568 - 1,
      toBlock: 18981568 + 1,
      protocolTokenAddress: '0x030bA81f1c18d280636F32af80b9AAd02Cf0854e',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      userAddress: '0x4C09DD7c598b12c781C4B5d74D245a1784a2E148',
      fromBlock: 19053555 - 1,
      toBlock: 19053555 + 1,
      protocolTokenAddress: '0xBcca60bB61934080951369a648Fb03DF4F96263C',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'borrows',
    input: {
      userAddress: '0x4C09DD7c598b12c781C4B5d74D245a1784a2E148',
      fromBlock: 19070103 - 1,
      toBlock: 19070103 + 1,
      protocolTokenAddress: '0x030bA81f1c18d280636F32af80b9AAd02Cf0854e',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    filterProtocolTokens: ['0xBcca60bB61934080951369a648Fb03DF4F96263C'],
    blockNumber: 19661885,
  },
]
