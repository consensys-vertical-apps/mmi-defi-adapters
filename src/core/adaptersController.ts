import { Protocol } from '../adapters/protocols'
import { IProtocolAdapter } from '../types/IProtocolAdapter'
import { Chain } from './constants/chains'

export class AdaptersController {
  private chainAdapters: Map<
    Chain,
    Map<Protocol, Map<string, IProtocolAdapter>>
  > = new Map()

  addAdapter(chainId: Chain, protocolId: Protocol, productId: string): void {
    // Instantiates adapter
  }

  fetchAdapter(
    chainId: Chain,
    protocolId: Protocol,
    productId: string,
  ): IProtocolAdapter {
    const adapter = this.chainAdapters
      .get(chainId)
      ?.get(protocolId)
      ?.get(productId)

    if (!adapter) {
      throw new Error('No Adapter')
    }

    return adapter
  }
}
