import { GetPositionsInput, ProtocolPosition } from '../../types/adapter'
import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { AdaptersController } from '../adaptersController'
import { ResolveUnderlyingPositions } from './resolveUnderlyingPositions'

describe('ResolveUnderlyingPositions', () => {
  const contextMock = {} as ClassMethodDecoratorContext

  it('returns original result when there are no underlying protocol tokens', async () => {
    const resultMock: ProtocolPosition[] = [
      {
        address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
        name: 'Liquid staked Ether 2.0',
        symbol: 'stETH',
        decimals: 18,
        balanceRaw: 4944483824413014n,
        type: 'protocol',
        tokens: [
          {
            address: '0x0000000000000000000000000000000000000000',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balanceRaw: 4944483824413014n,
            type: 'underlying',
          },
        ],
      },
    ]

    const fetchTokenAdapterMock = jest.fn()

    const [originalMethodMock, adapterMock, inputMock] = prepareMocks({
      originalMethodReturn: resultMock,
      fetchTokenAdapter: fetchTokenAdapterMock,
    })

    const replacementMethod = ResolveUnderlyingPositions(
      originalMethodMock,
      contextMock,
    )

    const result = await replacementMethod.call(adapterMock, inputMock)

    expect(originalMethodMock).toHaveBeenCalled()

    expect(fetchTokenAdapterMock).toHaveBeenCalledTimes(1)
    expect(fetchTokenAdapterMock).toHaveBeenCalledWith(
      1,
      '0x0000000000000000000000000000000000000000',
    )

    expect(result).toEqual(resultMock)
  })

  it('updates result when there is an underlying protocol token', async () => {
    const resultMock: ProtocolPosition[] = [
      {
        address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
        name: 'Wrapped liquid staked Ether 2.0',
        symbol: 'wstETH',
        decimals: 18,
        balanceRaw: 78871459289748529074876n,
        type: 'protocol',
        tokens: [
          {
            address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
            name: 'Liquid staked Ether 2.0',
            symbol: 'stETH',
            decimals: 18,
            type: 'underlying',
            balanceRaw: 90177902840852853190524n,
          },
        ],
      },
    ]

    const expected = [
      {
        ...resultMock[0],
        tokens: [
          {
            ...resultMock[0]!.tokens![0],
            tokens: [
              {
                address: '0x0000000000000000000000000000000000000000',
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
                type: 'underlying',
                balanceRaw: 90177902840852853190524n,
              },
            ],
          },
        ],
      },
    ]

    const getProtocolTokenToUnderlyingTokenRateMock = jest
      .fn()
      .mockResolvedValue({
        address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
        name: 'Liquid staked Ether 2.0',
        symbol: 'stETH',
        decimals: 18,
        baseRate: 1,
        type: 'protocol',
        tokens: [
          {
            address: '0x0000000000000000000000000000000000000000',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            type: 'underlying',
            underlyingRateRaw: 1000000000000000000n,
          },
        ],
      })

    const fetchTokenAdapterMock = jest
      .fn()
      .mockImplementation((_, tokenAddress: string) => {
        if (tokenAddress === '0xae7ab96520de3a18e5e111b5eaab095312d7fe84') {
          return {
            getProtocolTokenToUnderlyingTokenRate:
              getProtocolTokenToUnderlyingTokenRateMock,
          }
        }
      })

    const [originalMethodMock, adapterMock, inputMock] = prepareMocks({
      originalMethodReturn: resultMock,
      fetchTokenAdapter: fetchTokenAdapterMock,
      blockNumber: 12345,
    })

    const replacementMethod = ResolveUnderlyingPositions(
      originalMethodMock,
      contextMock,
    )

    const result = await replacementMethod.call(adapterMock, inputMock)

    expect(originalMethodMock).toHaveBeenCalled()

    expect(fetchTokenAdapterMock).toHaveBeenCalledTimes(2)
    expect(fetchTokenAdapterMock).toHaveBeenCalledWith(
      1,
      '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    )
    expect(fetchTokenAdapterMock).toHaveBeenCalledWith(
      1,
      '0x0000000000000000000000000000000000000000',
    )

    expect(getProtocolTokenToUnderlyingTokenRateMock).toHaveBeenCalledTimes(1)
    expect(getProtocolTokenToUnderlyingTokenRateMock).toHaveBeenCalledWith({
      protocolTokenAddress: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
      blockNumber: 12345,
    })

    expect(result).toEqual(expected)
  })

  it('updates result when there are two underlying protocol tokens', async () => {
    const resultMock: ProtocolPosition[] = [
      {
        address: '0x08a482c680b6d752ef01d498f051cd1929fe4454',
        name: 'Wrapped Wrapped liquid staked Ether 2.0',
        symbol: 'WWSTETH',
        decimals: 18,
        balanceRaw: 10000000000000000000000n,
        type: 'protocol',
        tokens: [
          {
            address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
            name: 'Wrapped liquid staked Ether 2.0',
            symbol: 'wstETH',
            decimals: 18,
            balanceRaw: 10000000000000000000000n,
            type: 'underlying',
          },
        ],
      },
    ]

    const expected = [
      {
        ...resultMock[0],
        tokens: [
          {
            ...resultMock[0]!.tokens![0],
            tokens: [
              {
                address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
                name: 'Liquid staked Ether 2.0',
                symbol: 'stETH',
                decimals: 18,
                balanceRaw: 15000000000000000000000n,
                type: 'underlying',
                tokens: [
                  {
                    address: '0x0000000000000000000000000000000000000000',
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18,
                    balanceRaw: 15000000000000000000000n,
                    type: 'underlying',
                  },
                ],
              },
            ],
          },
        ],
      },
    ]

    const getProtocolTokenToUnderlyingTokenRateMock = jest
      .fn()
      .mockImplementation(
        ({ protocolTokenAddress }: { protocolTokenAddress: string }) => {
          switch (protocolTokenAddress) {
            case '0xae7ab96520de3a18e5e111b5eaab095312d7fe84':
              return {
                address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
                name: 'Liquid staked Ether 2.0',
                symbol: 'stETH',
                decimals: 18,
                baseRate: 1,
                type: 'protocol',
                tokens: [
                  {
                    address: '0x0000000000000000000000000000000000000000',
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18,
                    type: 'underlying',
                    underlyingRateRaw: 1000000000000000000n,
                  },
                ],
              }
            case '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0':
              return {
                address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
                name: 'Wrapped liquid staked Ether 2.0',
                symbol: 'wstETH',
                decimals: 18,
                baseRate: 1,
                type: 'protocol',
                tokens: [
                  {
                    address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
                    name: 'Liquid staked Ether 2.0',
                    symbol: 'stETH',
                    decimals: 18,
                    type: 'underlying',
                    underlyingRateRaw: 1500000000000000000n,
                  },
                ],
              }
          }
        },
      )

    const fetchTokenAdapterMock = jest
      .fn()
      .mockImplementation((_, tokenAddress: string) => {
        if (tokenAddress === '0x0000000000000000000000000000000000000000') {
          return undefined
        }

        return {
          getProtocolTokenToUnderlyingTokenRate:
            getProtocolTokenToUnderlyingTokenRateMock,
        }
      })

    const [originalMethodMock, adapterMock, inputMock] = prepareMocks({
      originalMethodReturn: resultMock,
      fetchTokenAdapter: fetchTokenAdapterMock,
    })

    const replacementMethod = ResolveUnderlyingPositions(
      originalMethodMock,
      contextMock,
    )

    const result = await replacementMethod.call(adapterMock, inputMock)

    expect(originalMethodMock).toHaveBeenCalled()

    expect(fetchTokenAdapterMock).toHaveBeenCalledTimes(3)
    expect(fetchTokenAdapterMock).toHaveBeenCalledWith(
      1,
      '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    )
    expect(fetchTokenAdapterMock).toHaveBeenCalledWith(
      1,
      '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    )
    expect(fetchTokenAdapterMock).toHaveBeenCalledWith(
      1,
      '0x0000000000000000000000000000000000000000',
    )

    expect(getProtocolTokenToUnderlyingTokenRateMock).toHaveBeenCalledTimes(2)
    expect(getProtocolTokenToUnderlyingTokenRateMock).toHaveBeenCalledWith({
      protocolTokenAddress: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    })
    expect(getProtocolTokenToUnderlyingTokenRateMock).toHaveBeenCalledWith({
      protocolTokenAddress: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    })

    expect(result).toEqual(expected)
  })
})

function prepareMocks({
  originalMethodReturn,
  fetchTokenAdapter,
  blockNumber,
}: {
  originalMethodReturn: ProtocolPosition[]
  fetchTokenAdapter: AdaptersController['fetchTokenAdapter']
  blockNumber?: number
}): [IProtocolAdapter['getPositions'], IProtocolAdapter, GetPositionsInput] {
  return [
    jest.fn().mockResolvedValue(originalMethodReturn),
    {
      chainId: 1,
      adaptersController: {
        fetchTokenAdapter,
      },
    } as unknown as IProtocolAdapter,
    { blockNumber } as GetPositionsInput,
  ]
}
