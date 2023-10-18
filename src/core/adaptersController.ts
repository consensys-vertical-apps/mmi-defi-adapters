import { supportedProtocols } from '../adapters'
import { Protocol } from '../adapters/protocols'
import { IProtocolAdapter } from '../types/IProtocolAdapter'
import { Chain } from './constants/chains'
import { chainProviders } from './utils/chainProviders'

export class AdaptersController {
  private adapters: Map<Chain, Map<Protocol, Map<string, IProtocolAdapter>>> =
    new Map()

  buildAdapters(): void {
    Object.entries(supportedProtocols).forEach(
      ([protocolIdKey, supportedChains]) => {
        const protocolId = protocolIdKey as Protocol

        Object.entries(supportedChains).forEach(
          ([chainIdKey, adapterClasses]) => {
            const chainId = +chainIdKey as Chain
            const provider = chainProviders[chainId]!

            adapterClasses.forEach((adapterClass) => {
              const adapter = new adapterClass({
                provider,
                chainId,
                protocolId,
                adaptersController: this,
              })

              this.addAdapter(adapter)
            })
          },
        )
      },
    )
  }

  private addAdapter(adapter: IProtocolAdapter): void {
    const chainId = adapter.chainId
    const protocolId = adapter.protocolId
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
  }

  fetchAdapter(
    chainId: Chain,
    protocolId: Protocol,
    productId: string,
  ): IProtocolAdapter {
    const adapter = this.adapters.get(chainId)?.get(protocolId)?.get(productId)

    if (!adapter) {
      throw new Error('No Adapter')
    }

    return adapter
  }
}
