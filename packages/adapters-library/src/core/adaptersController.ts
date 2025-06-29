import { Connection } from '@solana/web3.js'
import { IMetadataProvider } from '../SQLiteMetadataProvider'
import { PricesSolanaUsdAdapter } from '../adapters/prices-solana/products/usd/pricesSolanaUsdAdapter'
import {
  IPricesAdapter,
  PricesV2UsdAdapter,
} from '../adapters/prices-v2/products/usd/pricesV2UsdAdapter'
import { Protocol } from '../adapters/protocols'
import {
  EvmChainAdapters,
  SolanaChainAdapters,
} from '../adapters/supportedProtocols'
import { Helpers, SolanaHelpers } from '../core/helpers'
import { IProtocolAdapter } from '../types/IProtocolAdapter'
import {
  PositionType,
  ProtocolAdapterParams,
  SolanaProtocolAdapterParams,
} from '../types/adapter'
import { Erc20Metadata } from '../types/erc20Metadata'
import { Support } from '../types/response'
import { Chain, EvmChain } from './constants/chains'
import { AdapterMissingError, NotImplementedError } from './errors/errors'
import { CustomJsonRpcProvider } from './provider/CustomJsonRpcProvider'
import { logger } from './utils/logger'

type ISupportedProtocols = Partial<
  Record<Protocol, EvmChainAdapters | SolanaChainAdapters>
>

export class AdaptersController {
  private adapters: Map<Chain, Map<Protocol, Map<string, IProtocolAdapter>>> =
    new Map()

  priceAdapters: Map<Chain, IPricesAdapter> = new Map()

  private protocolTokens:
    | Promise<Map<Chain, Map<string, IProtocolAdapter>>>
    | undefined

  constructor({
    evmProviders: providers,
    solanaProvider,
    supportedProtocols,
    metadataProviders,
  }: {
    evmProviders: Partial<Record<EvmChain, CustomJsonRpcProvider>>
    solanaProvider?: Connection
    supportedProtocols: ISupportedProtocols
    metadataProviders: Record<Chain, IMetadataProvider>
  }) {
    Object.entries(supportedProtocols).forEach(
      ([protocolIdKey, supportedChains]) => {
        const protocolId = protocolIdKey as Protocol

        Object.entries(supportedChains).forEach(
          ([chainIdKey, adapterClasses]) => {
            const chainId = +chainIdKey as Chain

            if (chainId === Chain.Solana) {
              if (!solanaProvider) {
                return
              }

              adapterClasses.forEach(
                (
                  solanaAdapterClass: new (
                    input: SolanaProtocolAdapterParams,
                  ) => IProtocolAdapter,
                ) => {
                  const adapter = new solanaAdapterClass({
                    provider: solanaProvider,
                    protocolId,
                    adaptersController: this,
                    helpers: new SolanaHelpers(
                      solanaProvider,
                      metadataProviders[chainId],
                    ),
                  })

                  this.mapAdapter(adapter)
                },
              )
            } else {
              const provider = providers[chainId]

              if (!provider) {
                return
              }

              adapterClasses.forEach(
                (
                  evmAdapterClass: new (
                    input: ProtocolAdapterParams,
                  ) => IProtocolAdapter,
                ) => {
                  const adapter = new evmAdapterClass({
                    provider,
                    chainId,
                    protocolId,
                    adaptersController: this,
                    helpers: new Helpers(
                      provider,
                      chainId,
                      metadataProviders[chainId],
                    ),
                  })

                  this.mapAdapter(adapter)
                },
              )
            }
          },
        )
      },
    )

    Object.entries(EvmChain).forEach(([_, chainId]) => {
      const chain = +chainId as EvmChain

      const provider = providers[chainId]

      if (!provider) {
        return
      }

      const priceAdapter = new PricesV2UsdAdapter({
        provider,
        chainId: chain,
        adaptersController: this,
        helpers: new Helpers(provider, chain, metadataProviders[chain]),
      })

      this.priceAdapters.set(chain, priceAdapter)
    })

    if (solanaProvider) {
      this.priceAdapters.set(
        Chain.Solana,
        new PricesSolanaUsdAdapter({
          provider: solanaProvider,
          adaptersController: this,
        }),
      )
    }
  }

  private mapAdapter(adapter: IProtocolAdapter) {
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
          const { includeInUnwrap } = adapter.adapterSettings

          if (!includeInUnwrap) {
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
        existingAdapter?.getProtocolDetails().positionType ===
        PositionType.FiatPrices

      if (existingAdapter && !isPriceAdapter) {
        const protocolDetails = existingAdapter.getProtocolDetails()
        const duplicateDetails = adapter.getProtocolDetails()

        const errorMessage = `${protocolToken.address} has already been added to the adapter map by 
          ${protocolDetails.protocolId} ${protocolDetails.productId} ${protocolDetails.chainId} 
          and is duplicated by 
          ${duplicateDetails.protocolId} ${duplicateDetails.productId} ${duplicateDetails.chainId}`

        logger.error(errorMessage)

        throw new Error(errorMessage)
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

  async getSupport({
    filterChainIds,
    filterProtocolIds,
    filterProductIds,
    includeProtocolTokens,
    filterWhereUserEventMissing,
  }: {
    filterChainIds?: Chain[]
    filterProtocolIds?: Protocol[]
    filterProductIds?: string[]
    includeProtocolTokens?: boolean
    filterWhereUserEventMissing?: boolean
  } = {}): Promise<Support> {
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

        for (const [productId, adapter] of products.entries()) {
          if (filterProductIds && !filterProductIds.includes(productId)) {
            continue
          }
          if (
            filterWhereUserEventMissing &&
            adapter.adapterSettings.userEvent
          ) {
            continue
          }

          let product = support[protocolId]!.find(
            (productEntry) =>
              adapter.getProtocolDetails().productId ===
              productEntry.protocolDetails.productId,
          )

          if (!product) {
            product = {
              protocolDetails: adapter.getProtocolDetails(),
              chains: [],

              userEvent: adapter.adapterSettings.userEvent,
            }

            support[protocolId]!.push(product)
          }

          product.chains.push(chainId)

          const protocolTokenAddresses = (
            await adapter.getProtocolTokens().catch(() => undefined)
          )?.map((token) => token.address)

          if (protocolTokenAddresses) {
            if (!product.protocolTokenAddresses) {
              product.protocolTokenAddresses = {}
            }

            product.protocolTokenAddresses[chainId] = protocolTokenAddresses
          }

          if (!includeProtocolTokens) {
            continue
          }

          const protocolTokens = await adapter
            .getProtocolTokens()
            .catch(() => undefined)

          if (protocolTokens) {
            if (!product.protocolTokens) {
              product.protocolTokens = {}
            }

            product.protocolTokens[chainId] = protocolTokens
          }
        }
      }
    }

    return support
  }

  async isTokenBelongToAdapter(
    tokenAddress: string,
    protocolId: Protocol,
    productId: string,
    chainId: Chain,
  ) {
    const adapter = await this.fetchTokenAdapter(chainId, tokenAddress)

    if (!adapter) {
      return false
    }

    if (protocolId !== adapter.getProtocolDetails().protocolId) {
      return false
    }
    if (productId !== adapter.getProtocolDetails().productId) {
      return false
    }

    return true
  }
}
