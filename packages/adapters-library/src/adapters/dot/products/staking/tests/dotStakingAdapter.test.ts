import { FunctionFragment, Interface, id } from 'ethers'
import { describe, expect, it, vi } from 'vitest'
import { Chain } from '../../../../../core/constants/chains'
import type { ProtocolAdapterParams } from '../../../../../types/adapter'
import { Protocol } from '../../../../protocols'
import {
  DOT_DEPLOYMENT_BLOCK,
  DOT_TOKEN,
  DOT_VAULT,
  DOT_VAULT_READ_ABI,
  DotStakingAdapter,
  MAX_EXIT_REQUESTS,
} from '../dotStakingAdapter'

const USER = '0x1111111111111111111111111111111111111111'
const OTHER = '0x2222222222222222222222222222222222222222'
const BLOCK = DOT_DEPLOYMENT_BLOCK + 100
const UNIT = 10n ** 18n
const abi = new Interface(DOT_VAULT_READ_ABI)
type State = { staked: bigint; exits: [bigint, bigint][]; count?: bigint }

function setup(state: State = { staked: 0n, exits: [] }) {
  let inFlight = 0
  let maximumInFlight = 0
  const read = vi.fn(
    async (request: { to: string; data: string; blockTag: number }) => {
      expect(request.to).toBe(DOT_VAULT)
      expect(Number.isSafeInteger(request.blockTag)).toBe(true)
      expect(Object.keys(request).sort()).toEqual(['blockTag', 'data', 'to'])
      inFlight++
      maximumInFlight = Math.max(maximumInFlight, inFlight)
      await Promise.resolve()
      inFlight--
      const call = abi.parseTransaction({ data: request.data })!
      expect(call.args[0]).toBe(USER)
      const values =
        call.name === 'staked'
          ? [state.staked]
          : call.name === 'nextExitId'
            ? [state.count ?? BigInt(state.exits.length)]
            : state.exits[Number(call.args[1])]!
      return abi.encodeFunctionResult(call.name, values)
    },
  )
  const provider = {
    chainId: Chain.Base,
    call: read,
    getBlockNumber: vi.fn(async () => BLOCK),
  }
  const params = {
    provider,
    chainId: Chain.Base,
    protocolId: Protocol.Dot,
    helpers: {},
    adaptersController: {},
  } as unknown as ProtocolAdapterParams
  return {
    adapter: new DotStakingAdapter(params),
    params,
    read,
    provider,
    maxConcurrent: () => maximumInFlight,
  }
}

describe('Dot staking principal adapter', () => {
  it('has a read-only ABI and watches the actual Staked event, not receipt transfers', () => {
    const { adapter } = setup()
    expect(
      abi.fragments.every(
        (f) => f instanceof FunctionFragment && f.stateMutability === 'view',
      ),
    ).toBe(true)
    expect(abi.fragments).toHaveLength(3)
    expect(adapter.adapterSettings).toEqual({
      includeInUnwrap: false,
      userEvent: { topic0: id('Staked(address,uint256)'), userAddressIndex: 1 },
    })
    expect('getRewardPositions' in adapter).toBe(false)
    expect('getTransactionParams' in adapter).toBe(false)
  })

  it('uses the canonical vault and underlying DOT without invented receipt tokens or prices', async () => {
    const { adapter, read } = setup()
    expect(adapter.getProtocolDetails().positionType).toBe('stake')
    expect(await adapter.getProtocolTokens()).toEqual([
      {
        address: DOT_VAULT,
        name: 'DOT staking (including pending withdrawals)',
        symbol: 'DOT',
        decimals: 18,
        underlyingTokens: [
          { address: DOT_TOKEN, name: 'Dot', symbol: 'DOT', decimals: 18 },
        ],
      },
    ])
    expect(read).not.toHaveBeenCalled()
  })

  it.each([
    ['empty', 0n, [], 0n],
    ['active', UNIT, [], UNIT],
    ['one wei', 1n, [], 1n],
    [
      'large precise balance',
      10n ** 35n + 123456789n,
      [],
      10n ** 35n + 123456789n,
    ],
    ['pending only', 0n, [[2n * UNIT, 9999999999n]], 2n * UNIT],
    ['matured but unwithdrawn', 0n, [[3n * UNIT, 1n]], 3n * UNIT],
    ['at unlock time', 0n, [[3n * UNIT, 1000n]], 3n * UNIT],
    ['active and pending', UNIT, [[2n * UNIT, 9999999999n]], 3n * UNIT],
    [
      'deleted exit holes',
      UNIT,
      [
        [0n, 0n],
        [2n * UNIT, 1n],
        [0n, 0n],
        [3n * UNIT, 9999999999n],
      ],
      6n * UNIT,
    ],
    [
      'fully withdrawn',
      0n,
      [
        [0n, 0n],
        [0n, 0n],
      ],
      0n,
    ],
  ] as [string, bigint, [bigint, bigint][], bigint][])(
    'accounts for %s',
    async (_, staked, exits, expected) => {
      const { adapter } = setup({ staked, exits })
      const positions = await adapter.getPositions({
        userAddress: USER,
        blockNumber: BLOCK,
      })
      if (expected === 0n) expect(positions).toEqual([])
      else {
        expect(positions).toHaveLength(1)
        expect(positions[0]!.balanceRaw).toBe(expected)
        expect(positions[0]!.tokens).toEqual([
          {
            address: DOT_TOKEN,
            name: 'Dot',
            symbol: 'DOT',
            decimals: 18,
            balanceRaw: expected,
            type: 'underlying',
          },
        ])
        expect('priceRaw' in positions[0]!.tokens![0]!).toBe(false)
      }
    },
  )

  it('pins every getter to the same explicit block when latest was requested', async () => {
    const { adapter, provider, read } = setup({
      staked: UNIT,
      exits: [
        [UNIT, 1n],
        [UNIT, 2n],
      ],
    })
    await adapter.getPositions({ userAddress: USER })
    expect(provider.getBlockNumber).toHaveBeenCalledTimes(1)
    expect(read.mock.calls.map(([r]) => r.blockTag)).toEqual([
      BLOCK,
      BLOCK,
      BLOCK,
      BLOCK,
    ])
  })

  it('preserves the requested historical block without falling back to latest', async () => {
    const { adapter, provider, read } = setup({
      staked: UNIT,
      exits: [[UNIT, 1n]],
    })
    await adapter.getPositions({
      userAddress: USER,
      blockNumber: DOT_DEPLOYMENT_BLOCK,
    })
    expect(provider.getBlockNumber).not.toHaveBeenCalled()
    expect(
      read.mock.calls.every(([r]) => r.blockTag === DOT_DEPLOYMENT_BLOCK),
    ).toBe(true)
  })

  it('returns no position before deployment without attempting a call', async () => {
    const { adapter, read } = setup({ staked: UNIT, exits: [] })
    expect(
      await adapter.getPositions({
        userAddress: USER,
        blockNumber: DOT_DEPLOYMENT_BLOCK - 1,
      }),
    ).toEqual([])
    expect(read).not.toHaveBeenCalled()
  })

  it.each([
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid block %s', async (blockNumber) => {
    const { adapter, read } = setup()
    await expect(
      adapter.getPositions({ userAddress: USER, blockNumber }),
    ).rejects.toThrow('Invalid DOT staking block')
    expect(read).not.toHaveBeenCalled()
  })

  it.each(['', '0x1', 'someone.eth', 'https://example.com'])(
    'rejects invalid user %s without resolving names',
    async (userAddress) => {
      const { adapter, read, provider } = setup()
      await expect(
        adapter.getPositions({ userAddress, blockNumber: BLOCK }),
      ).rejects.toThrow('Invalid DOT staking address')
      expect(read).not.toHaveBeenCalled()
      expect(provider.getBlockNumber).not.toHaveBeenCalled()
    },
  )

  it('validates both configured chain IDs', () => {
    const { params } = setup()
    expect(
      () => new DotStakingAdapter({ ...params, chainId: Chain.Ethereum }),
    ).toThrow('only supported on Base')
    expect(
      () =>
        new DotStakingAdapter({
          ...params,
          provider: {
            ...params.provider,
            chainId: Chain.Ethereum,
          } as ProtocolAdapterParams['provider'],
        }),
    ).toThrow('only supported on Base')
  })

  it.each([{ filter: [] }, { filter: [OTHER] }, { filter: [DOT_TOKEN] }])(
    'does not query an excluded or substituted vault',
    async ({ filter: protocolTokenAddresses }) => {
      const { adapter, read } = setup({ staked: UNIT, exits: [] })
      expect(
        await adapter.getPositions({
          userAddress: USER,
          protocolTokenAddresses,
        }),
      ).toEqual([])
      expect(read).not.toHaveBeenCalled()
    },
  )

  it('matches lowercase vault filters without duplicates', async () => {
    const { adapter } = setup({ staked: UNIT, exits: [] })
    expect(
      await adapter.getPositions({
        userAddress: USER,
        blockNumber: BLOCK,
        protocolTokenAddresses: [DOT_VAULT.toLowerCase(), DOT_VAULT],
      }),
    ).toHaveLength(1)
  })

  it('reads all exits within the budget, including early nonzero IDs, with bounded concurrency', async () => {
    const exits: [bigint, bigint][] = Array.from(
      { length: Number(MAX_EXIT_REQUESTS) },
      () => [0n, 0n],
    )
    exits[0] = [123n, 1n]
    exits[exits.length - 1] = [456n, 9999999999n]
    const { adapter, read, maxConcurrent } = setup({ staked: 1n, exits })
    const positions = await adapter.getPositions({
      userAddress: USER,
      blockNumber: BLOCK,
    })
    expect(positions[0]!.balanceRaw).toBe(580n)
    expect(read).toHaveBeenCalledTimes(Number(MAX_EXIT_REQUESTS) + 2)
    expect(maxConcurrent()).toBeLessThanOrEqual(16)
  })

  it.each([MAX_EXIT_REQUESTS + 1n, 2n ** 255n])(
    'rejects excessive exit count %s before enumeration',
    async (count) => {
      const { adapter, read } = setup({ staked: UNIT, exits: [], count })
      await expect(
        adapter.getPositions({ userAddress: USER, blockNumber: BLOCK }),
      ).rejects.toThrow('complete position unavailable')
      expect(read).toHaveBeenCalledTimes(2)
    },
  )

  it.each(['staked', 'nextExitId', 'exits'])(
    'propagates %s RPC failure instead of reporting zero or a partial total',
    async (failedMethod) => {
      const { adapter, read } = setup({ staked: UNIT, exits: [[UNIT, 1n]] })
      const implementation = read.getMockImplementation()!
      read.mockImplementation(async (request) => {
        if (abi.parseTransaction({ data: request.data })!.name === failedMethod)
          throw new Error('RPC unavailable')
        return implementation(request)
      })
      await expect(
        adapter.getPositions({ userAddress: USER, blockNumber: BLOCK }),
      ).rejects.toThrow('RPC unavailable')
    },
  )

  it('rejects malformed RPC output', async () => {
    const { adapter, read } = setup()
    read.mockResolvedValue('0x')
    await expect(
      adapter.getPositions({ userAddress: USER, blockNumber: BLOCK }),
    ).rejects.toThrow()
  })

  it('re-reads across withdrawals and owners without leaking cached balances', async () => {
    const state: State = { staked: 5n * UNIT, exits: [[2n * UNIT, 1n]] }
    const { adapter, read } = setup(state)
    expect(
      (
        await adapter.getPositions({ userAddress: USER, blockNumber: BLOCK })
      )[0]!.balanceRaw,
    ).toBe(7n * UNIT)
    state.exits[0] = [0n, 0n]
    expect(
      (
        await adapter.getPositions({
          userAddress: USER,
          blockNumber: BLOCK + 1,
        })
      )[0]!.balanceRaw,
    ).toBe(5n * UNIT)
    read.mockImplementation(async (request) => {
      const call = abi.parseTransaction({ data: request.data })!
      expect(call.args[0]).toBe(OTHER)
      return abi.encodeFunctionResult(call.name, [0n])
    })
    expect(
      await adapter.getPositions({
        userAddress: OTHER,
        blockNumber: BLOCK + 1,
      }),
    ).toEqual([])
  })

  it('reports the 1:1 underlying rate, not a fabricated USD price', async () => {
    const { adapter, read } = setup()
    const result = await adapter.unwrap({
      protocolTokenAddress: DOT_VAULT.toLowerCase(),
      blockNumber: BLOCK,
    })
    expect(result.tokens).toEqual([
      {
        address: DOT_TOKEN,
        name: 'Dot',
        symbol: 'DOT',
        decimals: 18,
        type: 'underlying',
        underlyingRateRaw: UNIT,
      },
    ])
    expect(read).not.toHaveBeenCalled()
    await expect(
      adapter.unwrap({ protocolTokenAddress: DOT_TOKEN }),
    ).rejects.toThrow('Unknown DOT staking position')
  })

  it('returns fresh metadata so caller mutations cannot substitute the underlying', async () => {
    const { adapter } = setup()
    const tokens = await adapter.getProtocolTokens()
    tokens[0]!.underlyingTokens[0]!.address = OTHER
    expect(
      (await adapter.getProtocolTokens())[0]!.underlyingTokens[0]!.address,
    ).toBe(DOT_TOKEN)
  })
})
