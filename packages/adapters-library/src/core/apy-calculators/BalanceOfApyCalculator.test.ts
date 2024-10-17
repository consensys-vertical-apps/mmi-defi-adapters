import { IProtocolAdapter } from '../../types/IProtocolAdapter'
import { ProtocolPosition } from '../../types/adapter'
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
      description:
        'Test Case 1 - aave-v3 - aEthWETH - Over 1 day - on 2024-10-13',
      userAddress: '0x1A0459cade0A33B9B054ba6F3942156Ea183c41F', // For information only. Isn't used by the tested code
      protocolTokenAddress: '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
      blocknumberStart: 20735336,
      blocknumberEnd: 20742482,
      protocolTokenStart: {
        symbol: 'aEthWETH',
        tokens: [
          {
            symbol: 'WETH',
            balanceRaw: 403022998786018909507n,
          },
        ],
      } as ProtocolPosition,
      protocolTokenEnd: {
        symbol: 'aEthWETH',
        tokens: [
          {
            symbol: 'WETH',
            balanceRaw: 403043295506130954963n,
          },
        ],
      } as ProtocolPosition,
      expectedApy: 1.85, // Value from DefiLlama https://defillama.com/yields/pool/e880e828-ca59-4ec6-8d4f-27182a4dc23d
      expectedDurationDays: 1,
      expectedFrequency: 365,
    },
    {
      description:
        'Test Case 2 - lido - stETH -  Over 7 days - From 2024-07-20 to 2024-07-27',
      userAddress: '0xEB9c1CE881F0bDB25EAc4D74FccbAcF4Dd81020a', // For information only. Isn't used by the tested code
      protocolTokenAddress: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
      blocknumberStart: 20295271,
      blocknumberEnd: 20345293,
      protocolTokenStart: {
        symbol: 'stETH',
        tokens: [
          {
            symbol: 'ETH',
            balanceRaw: 10190943752353059000084n,
          },
        ],
      } as ProtocolPosition,
      protocolTokenEnd: {
        symbol: 'stETH',
        tokens: [
          {
            symbol: 'ETH',
            balanceRaw: 10196922393515038005396n,
          },
        ],
      } as ProtocolPosition,
      expectedApy: 3.1, // Value from DefiLlama https://defillama.com/yields/pool/747c1d2a-c668-4682-b9f9-296708a3dd90
      expectedDurationDays: 7,
      expectedFrequency: 52.14,
    },
    {
      description:
        'Test Case 3 - maker - sDai - Over 1 Month - From 2024-09-03 to  2024-10-03',
      userAddress: '0xdd8AA75dF331158BEAD8C17d05dD26F96EE08Dc7', // For information only. Isn't used by the tested code
      protocolTokenAddress: '0x83F20F44975D03b1b09e64809B757c47f942BEeA',
      blocknumberStart: 20667923,
      blocknumberEnd: 20882303,
      protocolTokenStart: {
        symbol: 'sDAI',
        tokens: [
          {
            symbol: 'DAI',
            balanceRaw: 1008365787787487546506534n,
          },
        ],
      } as ProtocolPosition,
      protocolTokenEnd: {
        symbol: 'sDAI',
        tokens: [
          {
            symbol: 'DAI',
            balanceRaw: 1013193991248053613158266n,
          },
        ],
      } as ProtocolPosition,
      expectedApy: 6, // Value from DefiLlama https://defillama.com/yields/pool/c8a24fee-ec00-4f38-86c0-9f6daebc4225
      expectedDurationDays: 30,
      expectedFrequency: 365 / 30,
    },
  ]

  describe('when no withdraw/deposit/borrow/repay', () => {
    testCases.forEach(
      ({
        description,
        protocolTokenAddress,
        blocknumberStart,
        blocknumberEnd,
        protocolTokenStart,
        protocolTokenEnd,
        expectedApy,
        expectedDurationDays,
        expectedFrequency,
      }) => {
        it(description, async () => {
          // Mock the adapter to return the start and end positions for each test case
          mockAdapter.getPositions = jest
            .fn()
            .mockResolvedValueOnce(protocolTokenStart)
            .mockResolvedValueOnce(protocolTokenEnd)

          const result = await calculator.getApy({
            protocolTokenStart,
            protocolTokenEnd,
            blocknumberStart,
            blocknumberEnd,
            protocolTokenAddress,
            chainId: Chain.Ethereum,
            deposits: 0,
            withdrawals: 0,
            borrows: 0,
            repays: 0,
          })

          expect(result).toMatchObject({
            apyPercent: expect.closeTo(expectedApy, 1),
            apy: expect.closeTo(expectedApy / 100, 1),
            period: {
              blocknumberStart,
              blocknumberEnd,
            },
            compounding: {
              durationDays: expect.closeTo(expectedDurationDays, 2),
              frequency: expect.closeTo(expectedFrequency, 2),
            },
          })
        })
      },
    )
  })

  describe('when some deposits/withdrawals/borrows/repays', () => {
    it('returns a void APY calculation', async () => {
      const result = await calculator.getApy({
        protocolTokenStart: testCases[0]?.protocolTokenStart!,
        protocolTokenEnd: testCases[0]?.protocolTokenEnd!,
        blocknumberStart: testCases[0]?.blocknumberStart!,
        blocknumberEnd: testCases[0]?.blocknumberEnd!,
        protocolTokenAddress: testCases[0]?.protocolTokenAddress!,
        chainId: Chain.Ethereum,
        deposits: 12341441,
        withdrawals: 0,
        borrows: 0,
        repays: 0,
      })

      expect(result).toBeNull()
    })
  })
})
