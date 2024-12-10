import { Connection } from '@solana/web3.js'
import { IMetadataProvider } from '../SQLiteMetadataProvider'
import { Protocol } from '../adapters/protocols'
import { IProtocolAdapter } from '../types/IProtocolAdapter'
import { ProtocolAdapterParams } from '../types/adapter'
import { AdaptersController } from './adaptersController'
import { Chain } from './constants/chains'
import { AdapterMissingError } from './errors/errors'
import { CustomJsonRpcProvider } from './provider/CustomJsonRpcProvider'

const evmProviders = Object.values(Chain).reduce(
  (accumulator, current) => {
    return {
      ...accumulator,
      [current]: jest.fn() as unknown as CustomJsonRpcProvider,
    }
  },
  {} as Record<Chain, CustomJsonRpcProvider>,
)

const solanaProvider = jest.fn() as unknown as Connection

class MockProtocolAdapter {
  productId = 'example-pool'
}

const protocolIdMock = 'protocol-mock' as Protocol

const supportedProtocols = {
  [protocolIdMock]: {
    [Chain.Ethereum]: [MockProtocolAdapter],
  },
} as unknown as Record<
  Protocol,
  Partial<
    Record<Chain, (new (input: ProtocolAdapterParams) => IProtocolAdapter)[]>
  >
>

describe('AdaptersController', () => {
  let adaptersController: AdaptersController

  beforeEach(() => {
    adaptersController = new AdaptersController({
      evmProviders,
      solanaProvider,
      supportedProtocols,
      metadataProviders: {} as unknown as Record<Chain, IMetadataProvider>,
    })
  })

  describe('constructor', () => {
    it('creates a new instance if there are no deplicate adapters', () => {
      expect(adaptersController).toBeDefined()
    })

    it('throws an error if there are adapters with duplicate productId for the same protocol and chain', () => {
      const codeThatThrows = () =>
        new AdaptersController({
          evmProviders,
          solanaProvider,
          supportedProtocols: {
            [protocolIdMock]: {
              [Chain.Ethereum]: [MockProtocolAdapter, MockProtocolAdapter],
            },
          } as unknown as Record<
            Protocol,
            Partial<
              Record<
                Chain,
                (new (
                  input: ProtocolAdapterParams,
                ) => IProtocolAdapter)[]
              >
            >
          >,
          metadataProviders: {} as unknown as Record<Chain, IMetadataProvider>,
        })

      expect(codeThatThrows).toThrowError('Duplicated adapter')
    })
  })

  describe('fetchAdapter', () => {
    it('returns adapter if it exists', () => {
      const adapter = adaptersController.fetchAdapter(
        Chain.Ethereum,
        protocolIdMock,
        'example-pool',
      )

      expect(adapter).toBeDefined()
    })

    it('throws an error if no adapter can be found', () => {
      const codeThatThrows = () =>
        adaptersController.fetchAdapter(
          Chain.Ethereum,
          protocolIdMock,
          'no-product',
        )

      expect(codeThatThrows).toThrowError(AdapterMissingError)
    })
  })

  describe('fetchChainProtocolAdapters', () => {
    it('returns all adapters for a specific chain and protocol', () => {
      const adapters = adaptersController.fetchChainProtocolAdapters(
        Chain.Ethereum,
        protocolIdMock,
      )

      expect(adapters.size).toEqual(1)
      expect(adapters.get('example-pool')).toBeInstanceOf(MockProtocolAdapter)
    })
  })
})
