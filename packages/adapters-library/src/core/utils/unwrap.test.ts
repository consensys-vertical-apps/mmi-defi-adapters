import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { TokenType } from '../../types/adapter'
import { Chain } from '../constants/chains'
import {
  NotImplementedError,
  ProtocolSmartContractNotDeployedAtRequestedBlockNumberError,
} from '../errors/errors'
import type { IUnwrapCache } from '../unwrapCache'
import { unwrap } from './unwrap'

describe('unwrap', () => {
  let mockAdapter: IProtocolAdapter
  let mockUnwrapCache: IUnwrapCache
  let mockFetchTokenAdapter: Mock
  let mockFetchUnwrapWithCache: Mock
  let mockFetchPriceWithCache: Mock
  let mockPriceAdapter: { chainId: Chain; getPrice: Mock }

  beforeEach(() => {
    mockFetchTokenAdapter = vi.fn()
    mockFetchUnwrapWithCache = vi.fn()
    mockFetchPriceWithCache = vi.fn()
    mockPriceAdapter = {
      chainId: Chain.Ethereum,
      getPrice: vi.fn(),
    }

    mockAdapter = {
      chainId: Chain.Ethereum,
      protocolId: 'test-protocol',
      productId: 'test-product',
      adaptersController: {
        fetchTokenAdapter: mockFetchTokenAdapter,
        priceAdapters: new Map([[Chain.Ethereum, mockPriceAdapter]]),
      },
    } as unknown as IProtocolAdapter

    mockUnwrapCache = {
      fetchUnwrapWithCache: mockFetchUnwrapWithCache,
      fetchPriceWithCache: mockFetchPriceWithCache,
    }
  })

  it('should fetch price when no underlying adapter exists', async () => {
    const tokens = [
      {
        address: '0xTokenAddress',
        name: 'Test Token',
        symbol: 'TT',
        decimals: 18,
        type: TokenType.Protocol,
        balanceRaw: 1000000000000000000n,
      },
    ]

    mockFetchTokenAdapter.mockResolvedValue(undefined)
    mockFetchPriceWithCache.mockResolvedValue({
      tokens: [{ underlyingRateRaw: 2000000000000000000n }],
    })

    await unwrap(mockAdapter, undefined, tokens, 'balanceRaw', mockUnwrapCache)

    expect(mockFetchTokenAdapter).toHaveBeenCalledWith(
      Chain.Ethereum,
      '0xTokenAddress',
    )
    expect(mockFetchPriceWithCache).toHaveBeenCalled()
    expect(tokens[0].priceRaw).toBe(2000000000000000000n)
  })

  it('should unwrap token when underlying adapter exists', async () => {
    const tokens = [
      {
        address: '0xProtocolToken',
        name: 'Protocol Token',
        symbol: 'PT',
        decimals: 18,
        type: TokenType.Protocol,
        balanceRaw: 1000000000000000000n,
      },
    ]

    const mockUnderlyingAdapter = {
      chainId: Chain.Ethereum,
      unwrap: vi.fn(),
    } as unknown as IProtocolAdapter

    mockFetchTokenAdapter.mockResolvedValue(mockUnderlyingAdapter)
    mockFetchUnwrapWithCache.mockResolvedValue({
      tokens: [
        {
          address: '0xUnderlyingToken',
          name: 'Underlying Token',
          symbol: 'UT',
          decimals: 18,
          underlyingRateRaw: 1500000000000000000n, // 1.5
        },
      ],
    })

    await unwrap(mockAdapter, undefined, tokens, 'balanceRaw', mockUnwrapCache)

    expect(mockFetchUnwrapWithCache).toHaveBeenCalledWith(
      mockUnderlyingAdapter,
      {
        protocolTokenAddress: '0xProtocolToken',
        blockNumber: undefined,
      },
    )
    expect(tokens[0].tokens).toHaveLength(1)
    expect(tokens[0].tokens![0].address).toBe('0xUnderlyingToken')
    expect(tokens[0].tokens![0].balanceRaw).toBe(1500000000000000000n)
  })

  it('should not re-unwrap if token already has underlying tokens', async () => {
    const tokens = [
      {
        address: '0xProtocolToken',
        name: 'Protocol Token',
        symbol: 'PT',
        decimals: 18,
        type: TokenType.Protocol,
        balanceRaw: 1000000000000000000n,
        tokens: [
          {
            address: '0xExistingUnderlying',
            name: 'Existing Underlying',
            symbol: 'EU',
            decimals: 18,
            type: TokenType.Underlying,
            balanceRaw: 500000000000000000n,
          },
        ],
      },
    ]

    // Mock for the existing underlying token (which will be processed recursively)
    mockFetchTokenAdapter.mockResolvedValue(undefined)
    mockFetchPriceWithCache.mockResolvedValue({
      tokens: [{ underlyingRateRaw: 1000000000000000000n }],
    })

    await unwrap(mockAdapter, undefined, tokens, 'balanceRaw', mockUnwrapCache)

    // Should not fetch unwrap for parent (it already has underlying tokens)
    expect(mockFetchUnwrapWithCache).not.toHaveBeenCalled()
    // But should still try to get price for the existing underlying token
    expect(mockFetchPriceWithCache).toHaveBeenCalledTimes(1)
    // Verify the existing underlying structure is preserved
    expect(tokens[0].tokens).toHaveLength(1)
    expect(tokens[0].tokens![0].address).toBe('0xExistingUnderlying')
  })

  it('should recursively unwrap nested tokens', async () => {
    const tokens = [
      {
        address: '0xTopLevelToken',
        name: 'Top Level Token',
        symbol: 'TLT',
        decimals: 18,
        type: TokenType.Protocol,
        balanceRaw: 1000000000000000000n,
      },
    ]

    const mockTopLevelAdapter = {
      chainId: Chain.Ethereum,
    } as unknown as IProtocolAdapter

    const mockNestedAdapter = {
      chainId: Chain.Ethereum,
    } as unknown as IProtocolAdapter

    // First call returns top level adapter, second returns nested adapter
    mockFetchTokenAdapter
      .mockResolvedValueOnce(mockTopLevelAdapter)
      .mockResolvedValueOnce(mockNestedAdapter)
      .mockResolvedValue(undefined) // No more adapters after that

    mockFetchUnwrapWithCache
      .mockResolvedValueOnce({
        tokens: [
          {
            address: '0xMiddleToken',
            name: 'Middle Token',
            symbol: 'MT',
            decimals: 18,
            underlyingRateRaw: 2000000000000000000n,
          },
        ],
      })
      .mockResolvedValueOnce({
        tokens: [
          {
            address: '0xBottomToken',
            name: 'Bottom Token',
            symbol: 'BT',
            decimals: 18,
            underlyingRateRaw: 1000000000000000000n,
          },
        ],
      })

    mockFetchPriceWithCache.mockResolvedValue({
      tokens: [{ underlyingRateRaw: 100000000n }],
    })

    await unwrap(mockAdapter, undefined, tokens, 'balanceRaw', mockUnwrapCache)

    // Check top level token has middle token
    expect(tokens[0].tokens).toHaveLength(1)
    expect(tokens[0].tokens![0].address).toBe('0xMiddleToken')

    // Check middle token has bottom token
    expect(tokens[0].tokens![0].tokens).toHaveLength(1)
    expect(tokens[0].tokens![0].tokens![0].address).toBe('0xBottomToken')
  })

  it('should prevent circular references by tracking seen tokens', async () => {
    const tokens = [
      {
        address: '0xTokenA',
        name: 'Token A',
        symbol: 'TA',
        decimals: 18,
        type: TokenType.Protocol,
        balanceRaw: 1000000000000000000n,
      },
    ]

    const mockAdapterA = {
      chainId: Chain.Ethereum,
    } as unknown as IProtocolAdapter

    // Simulate circular: TokenA -> TokenA (same address)
    mockFetchTokenAdapter.mockResolvedValue(mockAdapterA)
    mockFetchUnwrapWithCache.mockResolvedValue({
      tokens: [
        {
          address: '0xTokenA', // Same as parent - circular!
          name: 'Token A Again',
          symbol: 'TA',
          decimals: 18,
          underlyingRateRaw: 1000000000000000000n,
        },
      ],
    })

    await unwrap(mockAdapter, undefined, tokens, 'balanceRaw', mockUnwrapCache)

    // Should add the underlying token but not recurse into it (circular prevention)
    expect(tokens[0].tokens).toHaveLength(1)
    expect(tokens[0].tokens![0].address).toBe('0xTokenA')
    // The circular token should not have further nested tokens
    expect(tokens[0].tokens![0].tokens).toBeUndefined()
  })

  it('should handle NotImplementedError gracefully', async () => {
    const tokens = [
      {
        address: '0xTokenAddress',
        name: 'Test Token',
        symbol: 'TT',
        decimals: 18,
        type: TokenType.Protocol,
        balanceRaw: 1000000000000000000n,
      },
    ]

    const mockUnderlyingAdapter = {
      chainId: Chain.Ethereum,
    } as unknown as IProtocolAdapter

    mockFetchTokenAdapter.mockResolvedValue(mockUnderlyingAdapter)
    mockFetchUnwrapWithCache.mockRejectedValue(new NotImplementedError())

    // Should not throw
    await expect(
      unwrap(mockAdapter, undefined, tokens, 'balanceRaw', mockUnwrapCache),
    ).resolves.not.toThrow()
  })

  it('should handle ProtocolSmartContractNotDeployedAtRequestedBlockNumberError gracefully', async () => {
    const tokens = [
      {
        address: '0xTokenAddress',
        name: 'Test Token',
        symbol: 'TT',
        decimals: 18,
        type: TokenType.Protocol,
        balanceRaw: 1000000000000000000n,
      },
    ]

    const mockUnderlyingAdapter = {
      chainId: Chain.Ethereum,
    } as unknown as IProtocolAdapter

    mockFetchTokenAdapter.mockResolvedValue(mockUnderlyingAdapter)
    mockFetchUnwrapWithCache.mockRejectedValue(
      new ProtocolSmartContractNotDeployedAtRequestedBlockNumberError(),
    )

    // Should not throw
    await expect(
      unwrap(mockAdapter, undefined, tokens, 'balanceRaw', mockUnwrapCache),
    ).resolves.not.toThrow()
  })

  it('should rethrow unexpected errors from unwrap', async () => {
    const tokens = [
      {
        address: '0xTokenAddress',
        name: 'Test Token',
        symbol: 'TT',
        decimals: 18,
        type: TokenType.Protocol,
        balanceRaw: 1000000000000000000n,
      },
    ]

    const mockUnderlyingAdapter = {
      chainId: Chain.Ethereum,
    } as unknown as IProtocolAdapter

    mockFetchTokenAdapter.mockResolvedValue(mockUnderlyingAdapter)
    mockFetchUnwrapWithCache.mockRejectedValue(new Error('Unexpected error'))

    await expect(
      unwrap(mockAdapter, undefined, tokens, 'balanceRaw', mockUnwrapCache),
    ).rejects.toThrow('Unexpected error')
  })

  it('should handle price fetch errors gracefully', async () => {
    const tokens = [
      {
        address: '0xTokenAddress',
        name: 'Test Token',
        symbol: 'TT',
        decimals: 18,
        type: TokenType.Protocol,
        balanceRaw: 1000000000000000000n,
      },
    ]

    mockFetchTokenAdapter.mockResolvedValue(undefined)
    mockFetchPriceWithCache.mockRejectedValue(new Error('Price fetch failed'))

    // Should not throw, just log the error
    await expect(
      unwrap(mockAdapter, undefined, tokens, 'balanceRaw', mockUnwrapCache),
    ).resolves.not.toThrow()

    // Price should not be set
    expect(tokens[0].priceRaw).toBeUndefined()
  })

  it('should pass blockNumber to fetch methods', async () => {
    const tokens = [
      {
        address: '0xTokenAddress',
        name: 'Test Token',
        symbol: 'TT',
        decimals: 18,
        type: TokenType.Protocol,
        balanceRaw: 1000000000000000000n,
      },
    ]

    const blockNumber = 12345678

    const mockUnderlyingAdapter = {
      chainId: Chain.Ethereum,
    } as unknown as IProtocolAdapter

    mockFetchTokenAdapter.mockResolvedValue(mockUnderlyingAdapter)
    mockFetchUnwrapWithCache.mockResolvedValue({ tokens: [] })

    await unwrap(
      mockAdapter,
      blockNumber,
      tokens,
      'balanceRaw',
      mockUnwrapCache,
    )

    expect(mockFetchUnwrapWithCache).toHaveBeenCalledWith(
      mockUnderlyingAdapter,
      {
        protocolTokenAddress: '0xTokenAddress',
        blockNumber: 12345678,
      },
    )
  })

  it('should handle multiple tokens in parallel', async () => {
    const tokens = [
      {
        address: '0xToken1',
        name: 'Token 1',
        symbol: 'T1',
        decimals: 18,
        type: TokenType.Protocol,
        balanceRaw: 1000000000000000000n,
      },
      {
        address: '0xToken2',
        name: 'Token 2',
        symbol: 'T2',
        decimals: 18,
        type: TokenType.Protocol,
        balanceRaw: 2000000000000000000n,
      },
    ]

    mockFetchTokenAdapter.mockResolvedValue(undefined)
    mockFetchPriceWithCache
      .mockResolvedValueOnce({
        tokens: [{ underlyingRateRaw: 100000000n }],
      })
      .mockResolvedValueOnce({
        tokens: [{ underlyingRateRaw: 200000000n }],
      })

    await unwrap(mockAdapter, undefined, tokens, 'balanceRaw', mockUnwrapCache)

    expect(mockFetchTokenAdapter).toHaveBeenCalledTimes(2)
    expect(tokens[0].priceRaw).toBe(100000000n)
    expect(tokens[1].priceRaw).toBe(200000000n)
  })

  it('should correctly calculate underlying balance using exchange rate', async () => {
    const tokens = [
      {
        address: '0xProtocolToken',
        name: 'Protocol Token',
        symbol: 'PT',
        decimals: 18,
        type: TokenType.Protocol,
        balanceRaw: 2000000000000000000n, // 2 tokens
      },
    ]

    const mockUnderlyingAdapter = {
      chainId: Chain.Ethereum,
    } as unknown as IProtocolAdapter

    mockFetchTokenAdapter.mockResolvedValue(mockUnderlyingAdapter)
    mockFetchUnwrapWithCache.mockResolvedValue({
      tokens: [
        {
          address: '0xUnderlyingToken',
          name: 'Underlying Token',
          symbol: 'UT',
          decimals: 18,
          underlyingRateRaw: 1500000000000000000n, // 1.5 rate
        },
      ],
    })

    await unwrap(mockAdapter, undefined, tokens, 'balanceRaw', mockUnwrapCache)

    // 2 tokens * 1.5 rate / 10^18 * 10^18 = 3 tokens
    expect(tokens[0].tokens![0].balanceRaw).toBe(3000000000000000000n)
  })
})
