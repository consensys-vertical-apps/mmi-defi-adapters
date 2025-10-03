import { ChainName, EvmChain } from '@metamask-institutional/defi-adapters'
import { Mutex } from 'async-mutex'
import type { Pool, PoolClient, QueryResult } from 'pg'
import type { Logger } from 'pino'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type CacheClient,
  createPostgresCacheClient,
} from './postgres-cache-client.js'
import { createDbPool } from './postgres-utils.js'
import { runMigrations } from './run-migrations.js'

vi.mock('./postgres-utils.js')
vi.mock('./run-migrations.js')
vi.mock('async-mutex')

describe('PostgresCacheClient', () => {
  let mockPool: Pool
  let mockClient: PoolClient
  let logger: Logger
  let cacheClient: CacheClient
  const mockRelease = vi.fn()

  beforeEach(async () => {
    mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: vi.fn(),
    } as unknown as PoolClient

    mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    } as unknown as Pool

    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger

    vi.mocked(createDbPool).mockReturnValue(mockPool)
    vi.mocked(runMigrations).mockResolvedValue(undefined)
    vi.mocked(Mutex).mockImplementation(
      () =>
        ({
          acquire: vi.fn().mockResolvedValue(mockRelease),
        }) as unknown as Mutex,
    )

    // We need to create the client within beforeEach to have spies on its methods
    cacheClient = await createPostgresCacheClient({
      dbUrl: 'test-db',
      chainId: EvmChain.Ethereum,
      logger,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createPostgresCacheClient', () => {
    it('should create schema, run migrations and return a client', async () => {
      expect(createDbPool).toHaveBeenCalledWith({
        dbUrl: 'test-db',
        schema: ChainName[EvmChain.Ethereum],
        logger,
        partialPoolConfig: undefined,
      })
      expect(mockPool.query).toHaveBeenCalledWith(
        `CREATE SCHEMA IF NOT EXISTS "${ChainName[EvmChain.Ethereum]}"`,
      )
      expect(runMigrations).toHaveBeenCalledWith(mockPool, logger)
    })
  })

  describe('getLatestBlockProcessed', () => {
    it('should return the block number if it exists', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ value: '123' }],
      } as QueryResult)
      const result = await cacheClient.getLatestBlockProcessed()
      expect(result).toBe(123)
    })

    it('should return undefined if block number does not exist', async () => {
      const result = await cacheClient.getLatestBlockProcessed()
      expect(result).toBeUndefined()
    })
  })

  describe('updateLatestBlockProcessed', () => {
    it('should call query to update the block number', async () => {
      await cacheClient.updateLatestBlockProcessed(456)
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE settings SET value = $1 WHERE key = $2',
        ['456', 'latest_block_processed'],
      )
    })
  })

  describe('fetchAllJobs', () => {
    it('should fetch and return all jobs', async () => {
      const jobs = [{ contractAddress: '0x123' }]
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: jobs,
      } as QueryResult)
      const result = await cacheClient.fetchAllJobs()
      expect(result).toEqual(jobs)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM jobs'),
      )
    })
  })

  describe('fetchUnfinishedJobs', () => {
    it('should fetch jobs not marked as completed', async () => {
      const jobs = [{ status: 'pending' }]
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: jobs,
      } as QueryResult)
      const result = await cacheClient.fetchUnfinishedJobs()
      expect(result).toEqual(jobs)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status <> $1'),
        ['completed'],
      )
    })
  })

  describe('insertJobs', () => {
    it('should insert jobs and return the count', async () => {
      const jobs = [
        { contractAddress: '0x1', topic0: '0xa' as const, userAddressIndex: 1 },
        { contractAddress: '0x2', topic0: '0xb' as const, userAddressIndex: 2 },
      ]
      vi.mocked(mockClient.query).mockImplementation(async (query) => {
        if (typeof query === 'string' && query.startsWith('INSERT')) {
          return { rowCount: 1 } as QueryResult
        }
        return {} as QueryResult
      })

      const count = await cacheClient.insertJobs(jobs, 123)

      expect(count).toBe(2)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO jobs'),
        expect.arrayContaining([jobs[0].contractAddress]),
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO jobs'),
        expect.arrayContaining([jobs[1].contractAddress]),
      )
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT')
      expect(mockRelease).toHaveBeenCalledOnce()
    })

    it('should rollback transaction on error', async () => {
      const error = new Error('DB Error')
      vi.mocked(mockClient.query).mockImplementation(async (query) => {
        if (typeof query === 'string' && query.startsWith('INSERT')) {
          throw error
        }
        return {} as QueryResult
      })

      await expect(
        cacheClient.insertJobs(
          [
            {
              contractAddress: '0x1',
              topic0: '0xa' as const,
              userAddressIndex: 1,
            },
          ],
          123,
        ),
      ).rejects.toThrow(error)
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
      expect(mockClient.release).toHaveBeenCalledOnce()
    })
  })

  describe('updateJobStatus', () => {
    it('should update statuses for multiple contracts', async () => {
      const contractAddresses = ['0x1', '0x2']
      await cacheClient.updateJobStatus(
        contractAddresses,
        '0xa',
        1,
        'completed',
      )

      expect(mockClient.query).toHaveBeenCalledTimes(4) // BEGIN, UPDATE, UPDATE, COMMIT
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE jobs'),
        ['completed', '0x1', '0xa', 1],
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE jobs'),
        ['completed', '0x2', '0xa', 1],
      )
    })
  })

  describe('insertLogs', () => {
    it('should insert logs in batches', async () => {
      const logs = Array.from({ length: 1500 }, (_, i) => ({
        address: `0x${i}`,
        contractAddress: `0xc${i}`,
      }))
      vi.mocked(mockClient.query).mockImplementation(async (query, params) => {
        if (typeof query === 'string' && query.startsWith('INSERT')) {
          // Batch size is 1000, params are (address, contractAddress)
          const rowCount = (params as string[]).length / 4
          return { rowCount } as QueryResult
        }
        return {} as QueryResult
      })

      const count = await cacheClient.insertLogs(logs)

      expect(count).toBe(1500)
      expect(mockClient.query).toHaveBeenCalledTimes(4) // BEGIN, INSERT, INSERT, COMMIT
      const firstInsert = vi
        .mocked(mockClient.query)
        .mock.calls.find(
          (call) => typeof call[0] === 'string' && call[0].includes('INSERT'),
        )
      expect(firstInsert).toBeDefined()
      if (firstInsert) {
        expect(firstInsert[1]).toHaveLength(4000)
      }
    })

    it('should update latest block if blockNumber is provided', async () => {
      // spy on the method to check if it's called within the transaction
      const updateLatestSpy = vi.spyOn(
        cacheClient,
        'updateLatestBlockProcessed',
      )
      vi.mocked(mockClient.query).mockResolvedValueOnce({
        rowCount: 1,
      } as QueryResult)

      await cacheClient.insertLogs(
        [{ address: '0x1', contractAddress: '0x2' }],
        999,
      )

      // The method in test uses the pool, not the client, so it's not transactional
      expect(updateLatestSpy).toHaveBeenCalledWith(999)
    })
  })
})
