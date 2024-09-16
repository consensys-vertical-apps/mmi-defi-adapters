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
     * Mock block data for binary search.
     * To simplify mocking, block has a timestamp equal to it block number, equivalent to each happening every 10 ms
     */
    provider.getBlock = jest
      .fn()
      .mockImplementation((blockNumer) =>
        Promise.resolve({ number: blockNumer, timestamp: 10 * blockNumer }),
      )

    const targetTimestamp = 152 // => we should find block { blockNumber: 15, timestamp: 150 }
    const targetDate = new Date(targetTimestamp)
    const block = await getBlockByDate(provider, targetDate)

    expect(block).not.toBeNull()
    expect(block?.number).toBe(15)
    expect(block?.timestamp).toBe(150)
  })

  //   it('should throw an error if block is not found', async () => {
  //     const mockGetBlock = provider.getBlock as jest.Mock

  //     // Simulate a case where no block is returned
  //     mockGetBlock.mockResolvedValue(null)

  //     const targetDate = new Date('2021-12-01T00:00:00Z')

  //     await expect(getBlockByDate(provider, targetDate)).rejects.toThrow(
  //       'Block null not found',
  //     )
  //   })

  //   it('should handle exact block with the same timestamp as target date', async () => {
  //     const mockGetBlockNumber = provider.getBlockNumber as jest.Mock
  //     const mockGetBlock = provider.getBlock as jest.Mock

  //     mockGetBlockNumber.mockResolvedValue(100)
  //     mockGetBlock.mockResolvedValueOnce({ number: 75, timestamp: 1638307200 }) // exact match

  //     const targetDate = new Date('2021-12-01T00:00:00Z')
  //     const block = await getBlockByDate(provider, targetDate)

  //     expect(block).not.toBeNull()
  //     expect(block?.number).toBe(75)
  //     expect(block?.timestamp).toBe(1638307200) // Exact timestamp match
  //   })
})
