import { EvmChain } from '@metamask-institutional/defi-adapters'
import { describe, expect, it } from 'vitest'
import { getNextPoolGroup } from './get-next-pool-group'

describe('getNextPoolGroup', () => {
  const chainId = EvmChain.Ethereum

  describe('empty pools handling', () => {
    it('should return undefined when no unfinished pools', async () => {
      const result = await getNextPoolGroup([], chainId)
      expect(result).toBeUndefined()
    })
  })

  describe('pending pools processing', () => {
    it('should process pending pools and return largest group', async () => {
      const unfinishedPools = [
        {
          contractAddress: '0x1111111111111111111111111111111111111111',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 1,
          blockNumber: 100,
          status: 'pending' as const,
        },
        {
          contractAddress: '0x2222222222222222222222222222222222222222',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 1,
          blockNumber: 200,
          status: 'pending' as const,
        },
        {
          contractAddress: '0x3333333333333333333333333333333333333333',
          topic0: '0xbbb' as const,
          eventAbi: 'event Test()',
          userAddressIndex: 2,
          blockNumber: 150,
          status: 'pending' as const,
        },
      ]

      const result = await getNextPoolGroup(unfinishedPools, chainId)

      expect(result).toEqual({
        poolAddresses: [
          '0x1111111111111111111111111111111111111111',
          '0x2222222222222222222222222222222222222222',
        ],
        topic0: '0xaaa',
        eventAbi: null,
        userAddressIndex: 1,
        targetBlockNumber: 200, // Max block number from the group
        batchSize: 1,
      })
    })

    it('should group pools by topic0 and userAddressIndex correctly', async () => {
      const unfinishedPools = [
        // Group 1: topic0=0xaaa, userAddressIndex=1 (3 pools)
        {
          contractAddress: '0x1111111111111111111111111111111111111111',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 1,
          blockNumber: 100,
          status: 'pending' as const,
        },
        {
          contractAddress: '0x2222222222222222222222222222222222222222',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 1,
          blockNumber: 200,
          status: 'pending' as const,
        },
        {
          contractAddress: '0x3333333333333333333333333333333333333333',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 1,
          blockNumber: 150,
          status: 'pending' as const,
        },
        // Group 2: topic0=0xaaa, userAddressIndex=2 (1 pool)
        {
          contractAddress: '0x4444444444444444444444444444444444444444',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 2,
          blockNumber: 120,
          status: 'pending' as const,
        },
        // Group 3: topic0=0xbbb, userAddressIndex=1 (2 pools)
        {
          contractAddress: '0x5555555555555555555555555555555555555555',
          topic0: '0xbbb' as const,
          eventAbi: 'event Test()',
          userAddressIndex: 1,
          blockNumber: 180,
          status: 'pending' as const,
        },
        {
          contractAddress: '0x6666666666666666666666666666666666666666',
          topic0: '0xbbb' as const,
          eventAbi: 'event Test()',
          userAddressIndex: 1,
          blockNumber: 250,
          status: 'pending' as const,
        },
      ]

      const result = await getNextPoolGroup(unfinishedPools, chainId)

      // Should return the largest group (Group 1 with 3 pools)
      expect(result).toEqual({
        poolAddresses: [
          '0x1111111111111111111111111111111111111111',
          '0x2222222222222222222222222222222222222222',
          '0x3333333333333333333333333333333333333333',
        ],
        topic0: '0xaaa',
        eventAbi: null,
        userAddressIndex: 1,
        targetBlockNumber: 200, // Max block number from the group
        batchSize: 1,
      })
    })

    it('should calculate target block number as maximum from group', async () => {
      const unfinishedPools = [
        {
          contractAddress: '0x1111111111111111111111111111111111111111',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 1,
          blockNumber: 300,
          status: 'pending' as const,
        },
        {
          contractAddress: '0x2222222222222222222222222222222222222222',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 1,
          blockNumber: 500, // This should be the target
          status: 'pending' as const,
        },
        {
          contractAddress: '0x3333333333333333333333333333333333333333',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 1,
          blockNumber: 100,
          status: 'pending' as const,
        },
      ]

      const result = await getNextPoolGroup(unfinishedPools, chainId)

      expect(result?.targetBlockNumber).toBe(500)
    })
  })

  describe('batch size calculation', () => {
    it('should return batch size 1 for small groups (<=maxBatchSize*10)', async () => {
      // Create pools that will result in a group of 50 (which is <= 10*10=100 for Ethereum)
      const unfinishedPools = Array.from({ length: 50 }, (_, i) => ({
        contractAddress: `0x${i.toString().padStart(40, '0')}`,
        topic0: '0xaaa' as const,
        eventAbi: null,
        userAddressIndex: 1,
        blockNumber: 100,
        status: 'pending' as const,
      }))

      const result = await getNextPoolGroup(unfinishedPools, EvmChain.Ethereum)

      expect(result?.batchSize).toBe(1)
    })

    it('should return maxBatchSize for very large groups (>=maxBatchSize*100)', async () => {
      // Create pools that will result in a group of 1500 (which is >= 10*100=1000 for Ethereum)
      const unfinishedPools = Array.from({ length: 1500 }, (_, i) => ({
        contractAddress: `0x${i.toString().padStart(40, '0')}`,
        topic0: '0xaaa' as const,
        eventAbi: null,
        userAddressIndex: 1,
        blockNumber: 100,
        status: 'pending' as const,
      }))

      const result = await getNextPoolGroup(unfinishedPools, EvmChain.Ethereum)

      expect(result?.batchSize).toBe(10) // MaxContractsPerCall for Ethereum
    })

    it('should calculate intermediate batch size for medium groups', async () => {
      // Create pools that will result in a group of 300 (which is between 100 and 1000 for Ethereum)
      const unfinishedPools = Array.from({ length: 300 }, (_, i) => ({
        contractAddress: `0x${i.toString().padStart(40, '0')}`,
        topic0: '0xaaa' as const,
        eventAbi: null,
        userAddressIndex: 1,
        blockNumber: 100,
        status: 'pending' as const,
      }))

      const result = await getNextPoolGroup(unfinishedPools, EvmChain.Ethereum)

      // The batch size should be calculated using the formula
      // Math.max(1, Math.floor((300 - 100) / ((1000 - 100) / 10)))
      // = Math.max(1, Math.floor(200 / 90))
      // = Math.max(1, 2) = 2
      expect(result?.batchSize).toBe(2)
    })

    it('should respect different chain limits', async () => {
      const unfinishedPools = Array.from({ length: 1500 }, (_, i) => ({
        contractAddress: `0x${i.toString().padStart(40, '0')}`,
        topic0: '0xaaa' as const,
        eventAbi: null,
        userAddressIndex: 1,
        blockNumber: 100,
        status: 'pending' as const,
      }))

      // Test Polygon which has MaxContractsPerCall = 5
      const polygonResult = await getNextPoolGroup(
        unfinishedPools,
        EvmChain.Polygon,
      )
      expect(polygonResult?.batchSize).toBe(5)

      // Test Ethereum which has MaxContractsPerCall = 10
      const ethereumResult = await getNextPoolGroup(
        unfinishedPools,
        EvmChain.Ethereum,
      )
      expect(ethereumResult?.batchSize).toBe(10)
    })
  })

  describe('failed pools processing', () => {
    it('should process failed pools when no pending pools exist', async () => {
      const unfinishedPools = [
        {
          contractAddress: '0x1111111111111111111111111111111111111111',
          topic0: '0xaaa' as const,
          eventAbi: 'event Test()',
          userAddressIndex: 1,
          blockNumber: 100,
          status: 'failed' as const,
        },
        {
          contractAddress: '0x2222222222222222222222222222222222222222',
          topic0: '0xbbb' as const,
          eventAbi: null,
          userAddressIndex: 2,
          blockNumber: 200,
          status: 'failed' as const,
        },
      ]

      const result = await getNextPoolGroup(unfinishedPools, chainId)

      expect(result).toEqual({
        poolAddresses: ['0x1111111111111111111111111111111111111111'],
        topic0: '0xaaa',
        eventAbi: 'event Test()',
        userAddressIndex: 1,
        targetBlockNumber: 100,
        batchSize: 1,
      })
    })

    it('should prioritize pending pools over failed pools', async () => {
      const unfinishedPools = [
        {
          contractAddress: '0x1111111111111111111111111111111111111111',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 1,
          blockNumber: 100,
          status: 'failed' as const,
        },
        {
          contractAddress: '0x2222222222222222222222222222222222222222',
          topic0: '0xbbb' as const,
          eventAbi: 'event Test()',
          userAddressIndex: 2,
          blockNumber: 200,
          status: 'pending' as const,
        },
      ]

      const result = await getNextPoolGroup(unfinishedPools, chainId)

      // Should return the pending pool, not the failed one
      expect(result).toEqual({
        poolAddresses: ['0x2222222222222222222222222222222222222222'],
        topic0: '0xbbb',
        eventAbi: 'event Test()',
        userAddressIndex: 2,
        targetBlockNumber: 200,
        batchSize: 1,
      })
    })

    it('should always return batch size 1 for failed pools', async () => {
      const unfinishedPools = [
        {
          contractAddress: '0x1111111111111111111111111111111111111111',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 1,
          blockNumber: 100,
          status: 'failed' as const,
        },
      ]

      const result = await getNextPoolGroup(unfinishedPools, chainId)

      expect(result?.batchSize).toBe(1)
      expect(result?.poolAddresses).toHaveLength(1)
    })
  })

  describe('mixed status pools', () => {
    it('should handle complex grouping with mixed statuses', async () => {
      const unfinishedPools = [
        // Pending group 1: 2 pools
        {
          contractAddress: '0x1111111111111111111111111111111111111111',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 1,
          blockNumber: 100,
          status: 'pending' as const,
        },
        {
          contractAddress: '0x2222222222222222222222222222222222222222',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 1,
          blockNumber: 200,
          status: 'pending' as const,
        },
        // Failed pool (should be processed only if no pending)
        {
          contractAddress: '0x4444444444444444444444444444444444444444',
          topic0: '0xbbb' as const,
          eventAbi: 'event Test()',
          userAddressIndex: 2,
          blockNumber: 150,
          status: 'failed' as const,
        },
        // Pending group 2: 1 pool (smaller than group 1)
        {
          contractAddress: '0x5555555555555555555555555555555555555555',
          topic0: '0xccc' as const,
          eventAbi: null,
          userAddressIndex: 3,
          blockNumber: 250,
          status: 'pending' as const,
        },
      ]

      const result = await getNextPoolGroup(unfinishedPools, chainId)

      // Should return the largest pending group (group 1 with 2 pools)
      expect(result).toEqual({
        poolAddresses: [
          '0x1111111111111111111111111111111111111111',
          '0x2222222222222222222222222222222222222222',
        ],
        topic0: '0xaaa',
        eventAbi: null,
        userAddressIndex: 1,
        targetBlockNumber: 200,
        batchSize: 1,
      })
    })
  })

  describe('edge cases', () => {
    it('should handle pools with same topic0 but different userAddressIndex', async () => {
      const unfinishedPools = [
        {
          contractAddress: '0x1111111111111111111111111111111111111111',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 1,
          blockNumber: 100,
          status: 'pending' as const,
        },
        {
          contractAddress: '0x2222222222222222222222222222222222222222',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 2, // Different userAddressIndex
          blockNumber: 200,
          status: 'pending' as const,
        },
      ]

      const result = await getNextPoolGroup(unfinishedPools, chainId)

      // Should treat them as separate groups and return the first one
      expect(result?.poolAddresses).toHaveLength(1)
      expect(result?.userAddressIndex).toBe(1)
    })

    it('should handle pools with different topic0 but same userAddressIndex', async () => {
      const unfinishedPools = [
        {
          contractAddress: '0x1111111111111111111111111111111111111111',
          topic0: '0xaaa' as const,
          eventAbi: null,
          userAddressIndex: 1,
          blockNumber: 100,
          status: 'pending' as const,
        },
        {
          contractAddress: '0x2222222222222222222222222222222222222222',
          topic0: '0xbbb' as const, // Different topic0
          eventAbi: null,
          userAddressIndex: 1,
          blockNumber: 200,
          status: 'pending' as const,
        },
      ]

      const result = await getNextPoolGroup(unfinishedPools, chainId)

      // Should treat them as separate groups and return the first one
      expect(result?.poolAddresses).toHaveLength(1)
      expect(result?.topic0).toBe('0xaaa')
    })

    it('should handle eventAbi correctly', async () => {
      const unfinishedPools = [
        {
          contractAddress: '0x1111111111111111111111111111111111111111',
          topic0: '0xaaa' as const,
          eventAbi: 'event Transfer(address from, address to, uint256 value)',
          userAddressIndex: 1,
          blockNumber: 100,
          status: 'pending' as const,
        },
      ]

      const result = await getNextPoolGroup(unfinishedPools, chainId)

      expect(result?.eventAbi).toBe(
        'event Transfer(address from, address to, uint256 value)',
      )
    })
  })
})
