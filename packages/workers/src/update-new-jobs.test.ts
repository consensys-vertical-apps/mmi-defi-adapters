import type {
  DefiProvider,
  EvmChain,
} from '@codefi/defi-adapters'
import type { Logger } from 'pino'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CacheClient } from './database/postgres-cache-client.js'
import { updateNewJobs } from './update-new-jobs'

vi.mock('ethers', async () => ({
  ...(await vi.importActual('ethers')),
  id: vi.fn(),
  Interface: vi.fn(),
}))

describe('updateNewJobs', () => {
  const mockCacheClient = {
    insertJobs: vi.fn(),
  } as unknown as CacheClient

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    level: 'info',
    fatal: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  } as unknown as Logger

  const mockDefiProvider = {
    getSupport: vi.fn(),
  } as unknown as DefiProvider

  const chainId = 1 as EvmChain
  const blockNumber = 12345

  const defaultParams = {
    chainId,
    blockNumber,
    defiProvider: mockDefiProvider,
    cacheClient: mockCacheClient,
    logger: mockLogger,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('updateNewJobs function', () => {
    it('should successfully update jobs with Transfer events', async () => {
      const mockSupport = {
        adapter1: [
          {
            userEvent: 'Transfer',
            protocolTokenAddresses: {
              [chainId]: ['0x1234567890123456789012345678901234567890'],
            },
          },
        ],
      }

      vi.mocked(mockDefiProvider.getSupport).mockResolvedValue(
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        mockSupport as any,
      )
      vi.mocked(mockCacheClient.insertJobs).mockResolvedValue(5)

      await updateNewJobs(defaultParams)

      expect(mockDefiProvider.getSupport).toHaveBeenCalledWith({
        filterChainIds: [chainId],
      })

      expect(mockCacheClient.insertJobs).toHaveBeenCalledWith(
        [
          {
            contractAddress: '0x1234567890123456789012345678901234567890',
            topic0:
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            userAddressIndex: 2,
          },
        ],
        blockNumber,
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        { totalJobs: 1, newJobs: 5 },
        'Jobs updated',
      )
    })

    it('should successfully update jobs with topic0-based events', async () => {
      const mockSupport = {
        adapter1: [
          {
            userEvent: {
              topic0:
                '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`,
              userAddressIndex: 1,
            },
            protocolTokenAddresses: {
              [chainId]: ['0x1234567890123456789012345678901234567890'],
            },
          },
        ],
      }

      vi.mocked(mockDefiProvider.getSupport).mockResolvedValue(
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        mockSupport as any,
      )
      vi.mocked(mockCacheClient.insertJobs).mockResolvedValue(3)

      await updateNewJobs(defaultParams)

      expect(mockCacheClient.insertJobs).toHaveBeenCalledWith(
        [
          {
            contractAddress: '0x1234567890123456789012345678901234567890',
            topic0:
              '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            userAddressIndex: 1,
          },
        ],
        blockNumber,
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        { totalJobs: 1, newJobs: 3 },
        'Jobs updated',
      )
    })

    it('should successfully update jobs with eventAbi-based events', async () => {
      const mockSupport = {
        adapter1: [
          {
            userEvent: {
              eventAbi: 'event Deposit(address indexed user, uint256 amount)',
              userAddressArgument: 'user',
            },
            protocolTokenAddresses: {
              [chainId]: ['0x1234567890123456789012345678901234567890'],
            },
          },
        ],
      }

      const mockEventFragment = {
        type: 'event',
        format: vi
          .fn()
          .mockReturnValue('Deposit(address indexed user, uint256 amount)'),
        inputs: [{ name: 'user' }, { name: 'amount' }],
      }

      const mockInterface = {
        fragments: [mockEventFragment],
      }

      const { Interface, id } = await import('ethers')
      vi.mocked(Interface).mockReturnValue(
        mockInterface as unknown as InstanceType<typeof Interface>,
      )
      vi.mocked(id).mockReturnValue(
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      )

      vi.mocked(mockDefiProvider.getSupport).mockResolvedValue(
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        mockSupport as any,
      )
      vi.mocked(mockCacheClient.insertJobs).mockResolvedValue(2)

      await updateNewJobs(defaultParams)

      expect(Interface).toHaveBeenCalledWith([
        'event Deposit(address indexed user, uint256 amount)',
      ])
      expect(id).toHaveBeenCalledWith(
        'Deposit(address indexed user, uint256 amount)',
      )

      expect(mockCacheClient.insertJobs).toHaveBeenCalledWith(
        [
          {
            contractAddress: '0x1234567890123456789012345678901234567890',
            topic0:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            userAddressIndex: 0,
            eventAbi: 'event Deposit(address indexed user, uint256 amount)',
          },
        ],
        blockNumber,
      )
    })

    it('should handle empty defi provider response', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      vi.mocked(mockDefiProvider.getSupport).mockResolvedValue({} as any)
      vi.mocked(mockCacheClient.insertJobs).mockResolvedValue(0)

      await updateNewJobs(defaultParams)

      expect(mockCacheClient.insertJobs).toHaveBeenCalledWith([], blockNumber)
      expect(mockLogger.info).toHaveBeenCalledWith(
        { totalJobs: 0, newJobs: 0 },
        'Jobs updated',
      )
    })

    it('should handle null defi provider response', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      vi.mocked(mockDefiProvider.getSupport).mockResolvedValue(null as any)
      vi.mocked(mockCacheClient.insertJobs).mockResolvedValue(0)

      await updateNewJobs(defaultParams)

      expect(mockCacheClient.insertJobs).toHaveBeenCalledWith([], blockNumber)
      expect(mockLogger.info).toHaveBeenCalledWith(
        { totalJobs: 0, newJobs: 0 },
        'Jobs updated',
      )
    })
  })

  describe('edge cases and error handling', () => {
    it('should skip entries without userEvent', async () => {
      const mockSupport = {
        adapter1: [
          {
            // No userEvent property
            protocolTokenAddresses: {
              [chainId]: ['0x1234567890123456789012345678901234567890'],
            },
          },
          {
            userEvent: 'Transfer',
            protocolTokenAddresses: {
              [chainId]: ['0x2222222222222222222222222222222222222222'],
            },
          },
        ],
      }

      vi.mocked(mockDefiProvider.getSupport).mockResolvedValue(
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        mockSupport as any,
      )
      vi.mocked(mockCacheClient.insertJobs).mockResolvedValue(1)

      await updateNewJobs(defaultParams)

      // Should only process the entry with userEvent
      expect(mockCacheClient.insertJobs).toHaveBeenCalledWith(
        [
          {
            contractAddress: '0x2222222222222222222222222222222222222222',
            topic0:
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            userAddressIndex: 2,
          },
        ],
        blockNumber,
      )
    })

    it('should handle invalid event fragment (not an event)', async () => {
      const mockSupport = {
        adapter1: [
          {
            userEvent: {
              eventAbi: 'function transfer(address to, uint256 amount)', // Not an event
              userAddressArgument: 'to',
            },
            protocolTokenAddresses: {
              [chainId]: ['0x1234567890123456789012345678901234567890'],
            },
          },
        ],
      }

      const mockEventFragment = {
        type: 'function', // Not an event
        format: vi.fn().mockReturnValue('transfer(address to, uint256 amount)'),
      }

      const mockInterface = {
        fragments: [mockEventFragment],
      }

      const { Interface } = await import('ethers')
      vi.mocked(Interface).mockReturnValue(
        mockInterface as unknown as InstanceType<typeof Interface>,
      )

      vi.mocked(mockDefiProvider.getSupport).mockResolvedValue(
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        mockSupport as any,
      )
      vi.mocked(mockCacheClient.insertJobs).mockResolvedValue(0)

      await updateNewJobs(defaultParams)

      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          contractAddress: '0x1234567890123456789012345678901234567890',
          userEvent: {
            eventAbi: 'function transfer(address to, uint256 amount)',
            userAddressArgument: 'to',
          },
          eventFragment: 'transfer(address to, uint256 amount)',
        },
        'Event fragment is not an event',
      )

      expect(mockCacheClient.insertJobs).toHaveBeenCalledWith([], blockNumber)
    })

    it('should handle user address argument not found in event inputs', async () => {
      const mockSupport = {
        adapter1: [
          {
            userEvent: {
              eventAbi: 'event Deposit(uint256 amount, address token)',
              userAddressArgument: 'user', // This argument doesn't exist
            },
            protocolTokenAddresses: {
              [chainId]: ['0x1234567890123456789012345678901234567890'],
            },
          },
        ],
      }

      const mockEventFragment = {
        type: 'event',
        format: vi
          .fn()
          .mockReturnValue('Deposit(uint256 amount, address token)'),
        inputs: [{ name: 'amount' }, { name: 'token' }],
      }

      const mockInterface = {
        fragments: [mockEventFragment],
      }

      const { Interface, id } = await import('ethers')
      vi.mocked(Interface).mockReturnValue(
        mockInterface as unknown as InstanceType<typeof Interface>,
      )
      vi.mocked(id).mockReturnValue(
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      )

      vi.mocked(mockDefiProvider.getSupport).mockResolvedValue(
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        mockSupport as any,
      )
      vi.mocked(mockCacheClient.insertJobs).mockResolvedValue(1)

      await updateNewJobs(defaultParams)

      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          address: '0x1234567890123456789012345678901234567890',
          userEvent: {
            eventAbi: 'event Deposit(uint256 amount, address token)',
            userAddressArgument: 'user',
          },
          eventFragment: 'Deposit(uint256 amount, address token)',
        },
        'User address index not found',
      )

      // Should still create the job with index -1
      expect(mockCacheClient.insertJobs).toHaveBeenCalledWith(
        [
          {
            contractAddress: '0x1234567890123456789012345678901234567890',
            topic0:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            userAddressIndex: -1,
            eventAbi: 'event Deposit(uint256 amount, address token)',
          },
        ],
        blockNumber,
      )
    })

    it('should deduplicate identical entries', async () => {
      const mockSupport = {
        adapter1: [
          {
            userEvent: 'Transfer',
            protocolTokenAddresses: {
              [chainId]: ['0x1234567890123456789012345678901234567890'],
            },
          },
          {
            userEvent: 'Transfer',
            protocolTokenAddresses: {
              [chainId]: ['0x1234567890123456789012345678901234567890'], // Same address
            },
          },
        ],
      }

      vi.mocked(mockDefiProvider.getSupport).mockResolvedValue(
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        mockSupport as any,
      )
      vi.mocked(mockCacheClient.insertJobs).mockResolvedValue(1)

      await updateNewJobs(defaultParams)

      // Should only have one entry due to deduplication
      expect(mockCacheClient.insertJobs).toHaveBeenCalledWith(
        [
          {
            contractAddress: '0x1234567890123456789012345678901234567890',
            topic0:
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            userAddressIndex: 2,
          },
        ],
        blockNumber,
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        { totalJobs: 1, newJobs: 1 }, // Only 1 job, not 2
        'Jobs updated',
      )
    })
  })
})
