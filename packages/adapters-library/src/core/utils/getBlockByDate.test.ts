import { JsonRpcProvider } from 'ethers'
import { getBlockByDate } from './getBlockByDate'

describe('getBlockByDate', () => {
  let provider: JsonRpcProvider

  beforeEach(() => {
    provider = {
      getBlock: jest.fn(),
      getBlockNumber: jest.fn(),
    } as unknown as JsonRpcProvider
  })

  it('should return the block closest to the target date', async () => {
    // Simulate latest block number and block timestamps
    provider.getBlockNumber = jest.fn().mockResolvedValue(100) // Latest block number is 100

    /**
     * To simplify mocking, block has a timestamp equal to it 10 x its block number, equivalent to each happening every 10 ms
     */
    provider.getBlock = jest
      .fn()
      .mockImplementation((blockNumer: number) =>
        Promise.resolve({ number: blockNumer, timestamp: 10 * blockNumer }),
      )

    const targetTimestamp = 152 // => We should find block { blockNumber: 15, timestamp: 150 }
    const targetDate = new Date(targetTimestamp)
    const block = await getBlockByDate(provider, targetDate)

    expect(block).not.toBeNull()
    expect(block?.number).toBe(15)
    expect(block?.timestamp).toBe(150)
  })
})
