import { EvmChain } from '@metamask-institutional/defi-adapters'
import type {
  Block,
  JsonRpcProvider,
  Log,
  Provider,
  TransactionReceipt,
  TransactionResponse,
} from 'ethers'
import type { Logger } from 'pino'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  CacheClient,
  JobDbEntry,
} from '../database/postgres-cache-client.js'
import { buildHistoricCache } from './build-historic-cache.js'
import * as fetchEvents from './fetch-events.js'
import * as getNextPoolGroup from './get-next-pool-group.js'
import * as parseUserEventLog from './parse-user-event-log.js'

vi.mock('../postgres-cache-client.js')
vi.mock('./get-next-pool-group.js')
vi.mock('./fetch-events.js')
vi.mock('./parse-user-event-log.js')
vi.mock('../utils/extractErrorMessage.js', () => ({
  extractErrorMessage: (e: Error) => e.message,
}))
vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers')
  return {
    ...actual,
    getAddress: (addr: string) => addr.toLowerCase(),
  }
})

function createMockLog(address: string, txHash: string): Log {
  // biome-ignore lint/suspicious/noExplicitAny: Hacking around circular reference
  const log: any = {
    address,
    transactionHash: txHash,
    topics: ['0xtopic'],
    data: '0xdata',
    blockNumber: 1,
    blockHash: '0xblockhash',
    removed: false,
    index: 1,
    transactionIndex: 1,
    provider: {} as Provider,
    toJSON: () => ({}),
    getBlock: vi.fn().mockResolvedValue({} as Block),
    getTransaction: vi.fn().mockResolvedValue({} as TransactionResponse),
    getTransactionReceipt: vi.fn().mockResolvedValue({} as TransactionReceipt),
  }
  log.removedEvent = () => log
  return log as Log
}

describe('buildHistoricCache', () => {
  let provider: JsonRpcProvider
  let cacheClient: CacheClient
  let logger: Logger
  const chainId = EvmChain.Ethereum

  beforeEach(() => {
    provider = {} as JsonRpcProvider
    cacheClient = {
      fetchUnfinishedJobs: vi.fn(),
      insertLogs: vi.fn(),
      updateJobStatus: vi.fn(),
    } as unknown as CacheClient
    logger = {
      info: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should wait and return if no next pool group is found', async () => {
    const unfinishedPools: (JobDbEntry & {
      status: 'pending' | 'failed'
    })[] = []
    vi.spyOn(cacheClient, 'fetchUnfinishedJobs').mockResolvedValue(
      unfinishedPools,
    )
    vi.spyOn(getNextPoolGroup, 'getNextPoolGroup').mockResolvedValue(undefined)

    const promise = buildHistoricCache(provider, chainId, cacheClient, logger)
    await vi.advanceTimersByTimeAsync(60_000)
    await promise

    expect(cacheClient.fetchUnfinishedJobs).toHaveBeenCalledOnce()
    expect(getNextPoolGroup.getNextPoolGroup).toHaveBeenCalledWith(
      unfinishedPools,
      chainId,
    )
    expect(logger.info).toHaveBeenCalledWith(
      expect.anything(),
      'Pools waiting to be processed',
    )
    // Should not have proceeded to process anything
    expect(fetchEvents.fetchEvents).not.toHaveBeenCalled()
  })

  it('should process a group of pools successfully', async () => {
    const unfinishedPools: (JobDbEntry & {
      status: 'pending' | 'failed'
    })[] = [
      {
        contractAddress: '0xaddress1',
        topic0:
          '0x0000000000000000000000000000000000000000000000000000000000000001',
        eventAbi:
          'event Transfer(address indexed from, address indexed to, uint256 value)',
        userAddressIndex: 1,
        blockNumber: 1,
        status: 'pending',
      },
    ]
    const nextPoolGroup = {
      poolAddresses: ['0xaddress1', '0xaddress2'],
      topic0:
        '0x0000000000000000000000000000000000000000000000000000000000000001' as const,
      eventAbi:
        'event Transfer(address indexed from, address indexed to, uint256 value)',
      userAddressIndex: 1,
      additionalMetadataArguments: undefined,
      transformUserAddressType: undefined,
      targetBlockNumber: 1000,
      batchSize: 2,
    }
    const logs: Log[] = [
      createMockLog('0xaddress1', '0xhash1'),
      createMockLog('0xaddress2', '0xhash2'),
    ]

    vi.spyOn(cacheClient, 'fetchUnfinishedJobs').mockResolvedValue(
      unfinishedPools,
    )
    vi.spyOn(getNextPoolGroup, 'getNextPoolGroup').mockResolvedValue(
      nextPoolGroup,
    )
    vi.spyOn(fetchEvents, 'fetchEvents').mockImplementation(async function* ({
      fromBlock,
    }: { fromBlock: number }) {
      if (fromBlock === 0) {
        yield logs
      } else {
        yield []
      }
    })
    vi.spyOn(parseUserEventLog, 'parseUserEventLog')
      .mockReturnValueOnce({ userAddress: '0xuser1', metadata: undefined })
      .mockReturnValueOnce({ userAddress: '0xuser2', metadata: undefined })
    vi.spyOn(cacheClient, 'insertLogs').mockResolvedValue(0)
    vi.spyOn(cacheClient, 'updateJobStatus').mockResolvedValue(undefined)

    await buildHistoricCache(provider, chainId, cacheClient, logger)

    expect(cacheClient.fetchUnfinishedJobs).toHaveBeenCalledOnce()
    expect(getNextPoolGroup.getNextPoolGroup).toHaveBeenCalledOnce()
    expect(fetchEvents.fetchEvents).toHaveBeenCalledTimes(5) // MaxConcurrentBatches
    expect(parseUserEventLog.parseUserEventLog).toHaveBeenCalledTimes(2)
    expect(cacheClient.insertLogs).toHaveBeenCalledWith([
      {
        address: '0xuser1',
        contractAddress: '0xaddress1',
        additionalMetadataArguments: undefined,
      },
      {
        address: '0xuser2',
        contractAddress: '0xaddress2',
        additionalMetadataArguments: undefined,
      },
    ])
    expect(cacheClient.updateJobStatus).toHaveBeenCalledWith(
      nextPoolGroup.poolAddresses,
      nextPoolGroup.topic0,
      nextPoolGroup.userAddressIndex,
      'completed',
    )
  })

  it('should handle errors during log fetching and mark jobs as failed', async () => {
    const unfinishedPools: (JobDbEntry & {
      status: 'pending' | 'failed'
    })[] = [
      {
        contractAddress: '0xaddress1',
        topic0:
          '0x0000000000000000000000000000000000000000000000000000000000000001',
        eventAbi:
          'event Transfer(address indexed from, address indexed to, uint256 value)',
        userAddressIndex: 1,
        blockNumber: 1,
        status: 'pending',
      },
    ]
    const nextPoolGroup = {
      poolAddresses: ['0xaddress1'],
      topic0:
        '0x0000000000000000000000000000000000000000000000000000000000000001' as const,
      eventAbi:
        'event Transfer(address indexed from, address indexed to, uint256 value)',
      userAddressIndex: 1,
      additionalMetadataMappedToTokenId: undefined,
      transformUserAddressType: undefined,
      targetBlockNumber: 1000,
      batchSize: 1,
    }
    const error = new Error('Fetch failed')

    vi.spyOn(cacheClient, 'fetchUnfinishedJobs').mockResolvedValue(
      unfinishedPools,
    )
    vi.spyOn(getNextPoolGroup, 'getNextPoolGroup').mockResolvedValue(
      nextPoolGroup,
    )
    vi.spyOn(fetchEvents, 'fetchEvents').mockImplementation(async function* () {
      yield* []
      throw error
    })
    vi.spyOn(cacheClient, 'updateJobStatus').mockResolvedValue(undefined)

    await buildHistoricCache(provider, chainId, cacheClient, logger)

    expect(cacheClient.fetchUnfinishedJobs).toHaveBeenCalledOnce()
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Fetch failed',
      }),
      'Fetching logs from pools batch failed',
    )
    expect(cacheClient.updateJobStatus).toHaveBeenCalledWith(
      nextPoolGroup.poolAddresses,
      nextPoolGroup.topic0,
      nextPoolGroup.userAddressIndex,
      'failed',
    )
  })

  it('should handle errors during log parsing and continue processing', async () => {
    const unfinishedPools: (JobDbEntry & {
      status: 'pending' | 'failed'
    })[] = [
      {
        contractAddress: '0xaddress1',
        topic0:
          '0x0000000000000000000000000000000000000000000000000000000000000001',
        eventAbi:
          'event Transfer(address indexed from, address indexed to, uint256 value)',
        userAddressIndex: 1,
        blockNumber: 1,
        status: 'pending',
      },
    ]
    const nextPoolGroup = {
      poolAddresses: ['0xaddress1'],
      topic0:
        '0x0000000000000000000000000000000000000000000000000000000000000001' as const,
      eventAbi:
        'event Transfer(address indexed from, address indexed to, uint256 value)',
      userAddressIndex: 1,
      additionalMetadataArguments: undefined,
      transformUserAddressType: undefined,
      targetBlockNumber: 1000,
      batchSize: 1,
    }
    const logs: Log[] = [createMockLog('0xaddress1', '0xhash1')]
    const error = new Error('Parse failed')

    vi.spyOn(cacheClient, 'fetchUnfinishedJobs').mockResolvedValue(
      unfinishedPools,
    )
    vi.spyOn(getNextPoolGroup, 'getNextPoolGroup').mockResolvedValue(
      nextPoolGroup,
    )
    vi.spyOn(fetchEvents, 'fetchEvents').mockImplementation(async function* () {
      yield logs
    })
    vi.spyOn(parseUserEventLog, 'parseUserEventLog').mockImplementation(() => {
      throw error
    })

    await buildHistoricCache(provider, chainId, cacheClient, logger)

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Parse failed',
      }),
      'Error parsing log',
    )
    // Still completes the job
    expect(cacheClient.updateJobStatus).toHaveBeenCalledWith(
      nextPoolGroup.poolAddresses,
      nextPoolGroup.topic0,
      nextPoolGroup.userAddressIndex,
      'completed',
    )
    // But inserts no logs (insertLogs is not called when logsToInsert is empty)
    expect(cacheClient.insertLogs).not.toHaveBeenCalled()
  })
})
