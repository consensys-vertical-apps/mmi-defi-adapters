import { Protocol } from '../adapters/protocols'
import {
  AssetType,
  PositionType,
  ProtocolAdapterParams,
} from '../types/adapter'
import { Erc20Metadata } from '../types/erc20Metadata'
import { IProtocolAdapter } from '../types/IProtocolAdapter'
import { Support } from '../types/response'
import { Chain } from './constants/chains'
import { AdapterMissingError, NotImplementedError } from './errors/errors'
import { CustomJsonRpcProvider } from './provider/CustomJsonRpcProvider'

export class AdaptersController {
  private adapters: Map<Chain, Map<Protocol, Map<string, IProtocolAdapter>>> =
    new Map()

  private protocolTokens:
    | Promise<Map<Chain, Map<string, IProtocolAdapter>>>
    | undefined

  constructor({
    providers,
    supportedProtocols,
  }: {
    providers: Record<Chain, CustomJsonRpcProvider>
    supportedProtocols: Partial<
      Record<
        Protocol,
        Partial<
          Record<
            Chain,
            (new (input: ProtocolAdapterParams) => IProtocolAdapter)[]
          >
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
    // Deferred promise so that only the first execution path does the work
    if (!this.protocolTokens) {
      this.protocolTokens = this.buildProtocolTokens()
    }

    const protocolTokens = await this.protocolTokens

    return protocolTokens.get(chainId)?.get(tokenAddress)
  }

  private async buildProtocolTokens(): Promise<
    Map<Chain, Map<string, IProtocolAdapter>>
  > {
    const protocolTokensAdapterMap: Map<
      Chain,
      Map<string, IProtocolAdapter>
    > = new Map()

    for (const [chainId, chainAdapters] of this.adapters) {
      protocolTokensAdapterMap.set(chainId, new Map())
      const chainAdaptersMap = protocolTokensAdapterMap.get(chainId)!

      for (const [_protocolId, protocolAdapters] of chainAdapters) {
        for (const [_productId, adapter] of protocolAdapters) {
          const {
            assetDetails: { type: assetType },
          } = adapter.getProtocolDetails()

          if (assetType == AssetType.NonStandardErc20) {
            continue
          }

          let protocolTokens: Erc20Metadata[]
          try {
            protocolTokens = await adapter.getProtocolTokens()
          } catch (error) {
            if (!(error instanceof NotImplementedError)) {
              throw error
            }
            continue
          }

          this.processDefaultCase(protocolTokens, chainAdaptersMap, adapter)
        }
      }
    }

    return protocolTokensAdapterMap
  }

  private processDefaultCase(
    protocolTokens: Erc20Metadata[],
    chainAdaptersMap: Map<string, IProtocolAdapter>,
    adapter: IProtocolAdapter,
  ) {
    for (const protocolToken of protocolTokens) {
      const tokenAddress = protocolToken.address

      const existingAdapter = chainAdaptersMap.get(tokenAddress)
      const isPriceAdapter =
        existingAdapter?.getProtocolDetails().positionType ==
        PositionType.FiatPrices

      if (existingAdapter && !isPriceAdapter) {
        throw new Error(`Duplicated protocol token ${protocolToken.address}`)
      }

      // override price adapter
      chainAdaptersMap.set(tokenAddress, adapter)
    }
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

  getSupport({
    filterChainIds,
    filterProtocolIds,
  }: {
    filterChainIds?: Chain[] | undefined
    filterProtocolIds?: Protocol[] | undefined
  } = {}): Support {
    const support: Support = {}
    for (const [chainId, protocols] of this.adapters.entries()) {
      if (filterChainIds && !filterChainIds.includes(chainId)) {
        continue
      }

      for (const [protocolId, products] of protocols.entries()) {
        if (filterProtocolIds && !filterProtocolIds.includes(protocolId)) {
          continue
        }

        if (!support[protocolId]) {
          support[protocolId] = []
        }

        for (const [_productId, adapter] of products.entries()) {
          let product = support[protocolId]!.find(
            (productEntry) =>
              adapter.getProtocolDetails().productId ===
              productEntry.protocolDetails.productId,
          )

          if (!product) {
            product = {
              protocolDetails: adapter.getProtocolDetails(),
              chains: [],
            }

            support[protocolId]!.push(product)
          }

          product.chains.push(chainId)
        }
      }
    }

    return support
  }
}
