import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { Chain } from '../constants/chains'
import { BalanceOfApyCalculator } from './BalanceOfApyCalculator'

describe('BalanceOfApyCalculator', () => {
  let calculator: BalanceOfApyCalculator
  let mockAdapter: IProtocolAdapter

  beforeAll(() => {
    calculator = new BalanceOfApyCalculator()

    mockAdapter = {
      getPositions: jest.fn(),
    } as unknown as IProtocolAdapter
  })

  const testCases = [
    {
      description: 'Test Case 1 - Aave V2 - aEthWETH on 2024-10-13',
      userAddress: '0x1A0459cade0A33B9B054ba6F3942156Ea183c41F',
      protocolTokenAddress: '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
      blockNumber: 20742482,
      positionsStartMock: [
        {
          tokens: [
            {
              symbol: 'aEthWETH',
              tokens: [
                {
                  symbol: 'WETH',
                  balanceRaw: 403022998786018909507n,
                },
              ],
            },
          ],
        },
      ],
      positionsEndMock: [
        {
          tokens: [
            {
              symbol: 'aEthWETH',
              tokens: [
                {
                  symbol: 'WETH',
                  balanceRaw: 403043295506130954963n,
                },
              ],
            },
          ],
        },
      ],
      expectedApy: 1.85, // Value from DefiLlama https://defillama.com/yields/pool/e880e828-ca59-4ec6-8d4f-27182a4dc23d
    },
    {
      description: 'Test Case 2 - Lido - stETH on 2024-07-14',
      userAddress: '0xEB9c1CE881F0bDB25EAc4D74FccbAcF4Dd81020a',
      protocolTokenAddress: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
      blockNumber: 20305293,
      positionsStartMock: [
        {
          tokens: [
            {
              symbol: 'stETH',
              tokens: [
                {
                  symbol: 'ETH',
                  balanceRaw: 10191753240915255785473n,
                },
              ],
            },
          ],
        },
      ],
      positionsEndMock: [
        {
          tokens: [
            {
              symbol: 'stETH',
              tokens: [
                {
                  symbol: 'ETH',
                  balanceRaw: 10192565940070211248044n,
                },
              ],
            },
          ],
        },
      ],
      expectedApy: 2.91, // Value from DefiLlama https://defillama.com/yields/pool/747c1d2a-c668-4682-b9f9-296708a3dd90
    },
    {
      description: 'Test Case 3 - Maker DAO - sDai on 2024-09-03',
      userAddress: '0xdd8AA75dF331158BEAD8C17d05dD26F96EE08Dc7',
      protocolTokenAddress: '0x83F20F44975D03b1b09e64809B757c47f942BEeA',
      blockNumber: 20667923,
      positionsStartMock: [
        {
          tokens: [
            {
              symbol: 'sDAI',
              tokens: [
                {
                  symbol: 'DAI',
                  balanceRaw: 1008205293709966671435601n,
                },
              ],
            },
          ],
        },
      ],
      positionsEndMock: [
        {
          tokens: [
            {
              symbol: 'sDAI',
              tokens: [
                {
                  symbol: 'DAI',
                  balanceRaw: 1008365787787487546506534n,
                },
              ],
            },
          ],
        },
      ],
      expectedApy: 6, // Value from DefiLlama https://defillama.com/yields/pool/c8a24fee-ec00-4f38-86c0-9f6daebc4225
    },
  ]

  testCases.forEach(
    ({
      description,
      userAddress,
      protocolTokenAddress,
      blockNumber,
      positionsStartMock,
      positionsEndMock,
      expectedApy,
    }) => {
      it(description, async () => {
        // Mock the adapter to return the start and end positions for each test case
        mockAdapter.getPositions = jest
          .fn()
          .mockResolvedValueOnce(positionsStartMock)
          .mockResolvedValueOnce(positionsEndMock)

        const result = await calculator.getApy({
          userAddress,
          blockNumber,
          protocolTokenAddress,
          chainId: Chain.Ethereum,
          adapter: mockAdapter,
        })

        expect(result.apyPercent).toBeCloseTo(expectedApy, 1)
      })
    },
  )
})
