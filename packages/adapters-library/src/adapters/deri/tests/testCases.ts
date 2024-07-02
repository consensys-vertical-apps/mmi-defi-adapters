import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'
import { WriteActions } from '../../../types/writeActions'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    input: {
      userAddress: '0x81040dae0d9db2cad734da39bf4a14e46d77feb3',
      filterProtocolTokens: ['0xd849c2b7991060023e5d92b92c68f4077ae2c2ba'],

      filterTokenIds: [
        '452312848583266388373385778560718648249770263156390604487522901302855073939',
      ],
    },
    blockNumber: 225214200,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'deposits',
    input: {
      userAddress: '0x81040dae0d9db2cad734da39bf4a14e46d77feb3',
      fromBlock: 225214170,
      toBlock: 225214210,
      protocolTokenAddress: '0xd849c2b7991060023e5d92b92c68f4077ae2c2ba',
      productId: 'pool',
      tokenId:
        '452312848583266388373385778560718648249770263156390604487522901302855073939',
    },
  },
  {
    chainId: Chain.Arbitrum,
    method: 'withdrawals',
    input: {
      userAddress: '0x81040dae0d9db2cad734da39bf4a14e46d77feb3',
      fromBlock: 225236310,
      toBlock: 225236350,
      protocolTokenAddress: '0xd849c2b7991060023e5d92b92c68f4077ae2c2ba',
      productId: 'pool',
      tokenId:
        '452312848583266388373385778560718648249770263156390604487522901302855073939',
    },
  },
  {
    chainId: Chain.Arbitrum,
    method: 'profits',
    input: {
      userAddress: '0xd5d2b6e9a034386d188e495ff8cec3da64a47cf7',
      timePeriod: TimePeriod.sevenDays,
      filterProtocolTokens: ['0x48e33d67d286fd1901693c66d16494192ece9fa6'],
      filterTokenIds: [
        '1356938545749799165120034098941092928353442018356707511045785276364676399107',
      ],
    },
    blockNumber: 225449208,
  },
]
