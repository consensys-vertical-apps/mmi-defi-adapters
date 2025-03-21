import { Chain, EvmChain } from './core/constants/chains'
import { CustomJsonRpcProvider } from './core/provider/CustomJsonRpcProvider'
import { DefiProvider } from './defiProvider'

const mockChainBlockNumbers = Object.values(EvmChain).reduce(
  (accumulator, chainId) => {
    return {
      ...accumulator,
      [chainId]: chainId + 100000,
    }
  },
  {} as Record<Chain, number>,
)

describe('DefiProvider', () => {
  let defiProvider: DefiProvider

  beforeEach(() => {
    defiProvider = new DefiProvider()

    defiProvider.chainProvider.providers = Object.values(EvmChain).reduce(
      (accumulator, chainId) => {
        return {
          ...accumulator,
          [chainId]: {
            chainId,
            getStableBlockNumber: jest
              .fn()
              .mockResolvedValue(mockChainBlockNumbers[chainId]),
          },
        }
      },
      {} as Record<EvmChain, CustomJsonRpcProvider>,
    )
  })

  describe('getStableBlockNumbers', () => {
    it('returns a block number for each chain', async () => {
      const result = await defiProvider.getStableBlockNumbers()

      expect(result).toEqual(mockChainBlockNumbers)
      Object.values(EvmChain).forEach((chainId) => {
        expect(
          defiProvider.chainProvider.providers[chainId]?.getStableBlockNumber,
        ).toHaveBeenCalled()
      })
    })

    it('returns a block number for filtered chains only', async () => {
      const filtereChainIds = [Chain.Ethereum, Chain.Arbitrum]
      const result = await defiProvider.getStableBlockNumbers(filtereChainIds)

      expect(result).toEqual(
        filtereChainIds.reduce(
          (accumulator, chainId) => {
            return {
              ...accumulator,
              [chainId]: mockChainBlockNumbers[chainId],
            }
          },
          {} as Record<Chain, number>,
        ),
      )
      filtereChainIds.forEach((chainId) => {
        expect(
          defiProvider.chainProvider.providers[chainId]?.getStableBlockNumber,
        ).toHaveBeenCalled()
      })
    })
  })
})
