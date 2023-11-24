import { Protocol } from '../adapters/protocols'
import { PositionType, ProtocolAdapterParams } from '../types/adapter'
import { Erc20Metadata } from '../types/erc20Metadata'
import { IProtocolAdapter } from '../types/IProtocolAdapter'
import { Chain } from './constants/chains'
import { AdapterMissingError, NotImplementedError } from './errors/errors'
import { CustomJsonRpcProvider } from './utils/customJsonRpcProvider'

export class AdaptersController {
  private adapters: Map<Chain, Map<Protocol, Map<string, IProtocolAdapter>>> =
    new Map()

  private protocolTokens: Map<Chain, Map<string, IProtocolAdapter>> = new Map()

  constructor({
    providers,
    supportedProtocols,
  }: {
    providers: Record<Chain, CustomJsonRpcProvider>
    supportedProtocols: Record<
      Protocol,
      Partial<
        Record<
          Chain,
          (new (input: ProtocolAdapterParams) => IProtocolAdapter)[]
        >
      >
    >
  }) {
    Object.entries(supportedProtocols).forEach(
      ([protocolIdKey, supportedChains]) => {
        const protocolId = protocolIdKey as Protocol

        Object.entries(supportedChains).forEach(
          ([chainIdKey, adapterClasses]) => {
            const chainId = +chainIdKey as Chain
            const provider = providers[chainId]!

            adapterClasses.forEach((adapterClass) => {
              const adapter = new adapterClass({
                provider,
                chainId,
                protocolId,
                adaptersController: this,
              })

              const productId = adapter.productId

              if (!this.adapters.has(chainId)) {
                this.adapters.set(chainId, new Map())
              }

              const chainAdapters = this.adapters.get(chainId)!

              if (!chainAdapters.has(protocolId)) {
                chainAdapters.set(protocolId, new Map())
              }

              const protocolAdapters = chainAdapters.get(protocolId)!

              if (protocolAdapters.has(productId)) {
                throw new Error('Duplicated adapter')
              }

              protocolAdapters.set(productId, adapter)
            })
          },
        )
      },
    )
  }

  async fetchTokenAdapter(
    chainId: Chain,
    tokenAddress: string,
  ): Promise<IProtocolAdapter | undefined> {
    // Only run this first time
    if (this.protocolTokens.size === 0) {
      for (const [chainId, chainAdapters] of this.adapters) {
        this.protocolTokens.set(chainId, new Map())
        const chainAdaptersMap = this.protocolTokens.get(chainId)!

        for (const [_protocolId, protocolAdapters] of chainAdapters) {
          for (const [_productId, adapter] of protocolAdapters) {
            const { positionType } = adapter.getProtocolDetails()

            if (positionType === PositionType.Reward) {
              continue
            }

            let protocolTokens: Erc20Metadata[]
            try {
              protocolTokens = await adapter.getProtocolTokens()
            } catch (error) {
              if (!(error instanceof NotImplementedError)) {
                throw error
              }
              protocolTokens = []
            }

            for (const protocolToken of protocolTokens) {
              if (chainAdaptersMap.has(protocolToken.address)) {
                throw Error(
                  `Duplicated protocol token ${protocolToken.address}`,
                )
              }

              chainAdaptersMap.set(protocolToken.address, adapter)
            }
          }
        }
      }
    }

    return this.protocolTokens.get(chainId)?.get(tokenAddress)
  }

  fetchAdapter(
    chainId: Chain,
    protocolId: Protocol,
    productId: string,
  ): IProtocolAdapter {
    const adapter = this.adapters.get(chainId)?.get(protocolId)?.get(productId)

    if (!adapter) {
      throw new AdapterMissingError(chainId, protocolId, productId)
    }

    return adapter
  }

  fetchChainProtocolAdapters(
    chainId: Chain,
    protocolId: Protocol,
  ): Map<string, IProtocolAdapter> {
    const adapters = this.adapters.get(chainId)?.get(protocolId)

    if (!adapters) {
      throw new AdapterMissingError(chainId, protocolId)
    }

    return adapters
  }
}
