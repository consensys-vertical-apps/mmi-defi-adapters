import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'

import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'

import { nativeTokenAddresses } from '../../../../core/utils/nativeTokens'
import { Helpers } from '../../../../scripts/helpers'

import {
  AdapterSettings,
  TokenType,
  UnwrapExchangeRate,
} from '../../../../types/adapter'

import { ChainLink__factory, OneInchOracle__factory } from '../../contracts'
import { priceAdapterConfig } from './priceV2Config'
import { Erc20Metadata } from '../../../../types/erc20Metadata'

export const USD = 'USD'

export interface SpotPrice {
  allTimeHigh?: number
  allTimeLow?: number
  circulatingSupply?: number
  dilutedMarketCap?: number
  high1d?: number
  id?: string
  low1d?: number
  marketCap?: number
  marketCapPercentChange1d?: number
  price: number
  priceChange1d?: number
  pricePercentChange1d?: number
  pricePercentChange1h?: number
  pricePercentChange1y?: number
  pricePercentChange7d?: number
  pricePercentChange14d?: number
  pricePercentChange30d?: number
  pricePercentChange200d?: number
  totalVolume?: number
}

export interface GetSpotPriceByAddressInput {
  tokenAddresses: string
  vsCurrency?: string
  chainId: number
}

export type IPricesInput = {
  blockNumber?: number
  tokenMetadata: Erc20Metadata
}
export interface IPricesAdapter {
  adapterSettings: AdapterSettings

  helpers: Helpers

  chainId: Chain

  productId: string

  adaptersController: AdaptersController

  getPrice({
    blockNumber,
    tokenMetadata,
  }: IPricesInput): Promise<UnwrapExchangeRate>
}

// Project details:
// https://github.com/1inch/spot-price-aggregator

export class PricesV2UsdAdapter implements IPricesAdapter {
  productId = 'usd'
  chainId: Chain
  helpers: Helpers

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

  private provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

  constructor({
    provider,
    chainId,

    adaptersController,
    helpers,
  }: {
    provider: CustomJsonRpcProvider
    chainId: Chain
    adaptersController: AdaptersController
    helpers: Helpers
  }) {
    this.provider = provider
    this.chainId = chainId

    this.adaptersController = adaptersController
    this.helpers = helpers
  }

  private async getSpotPriceByAddress({
    tokenAddresses,
    vsCurrency = 'usd',
    chainId,
  }: GetSpotPriceByAddressInput): Promise<SpotPrice | null> {
    const baseUrl = 'https://price-api.metafi.codefi.network'
    const url = `${baseUrl}/v1/chains/${chainId}/spot-prices/${tokenAddresses}`

    try {
      const params = new URLSearchParams()
      if (vsCurrency) params.append('vsCurrency', vsCurrency)

      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Error fetching spot price: ${response.statusText}`)
      }

      const data: SpotPrice = await response.json()
      return data
    } catch (error) {
      console.error('Failed to fetch spot price:', error)
      return null
    }
  }

  private async getEthUsdPriceFromChainlink(blockNumber: number | undefined) {
    const usdFeed = ChainLink__factory.connect(
      priceAdapterConfig[this.chainId as keyof typeof priceAdapterConfig]
        .chainlinkUsdEthFeed,
      this.provider,
    )

    const ethPriceUSD = await usdFeed.latestRoundData({
      blockTag: blockNumber,
    })
    return ethPriceUSD.answer
  }

  async getPrice({
    blockNumber,
    tokenMetadata,
  }: {
    blockNumber: number
    tokenMetadata: Erc20Metadata
  }): Promise<UnwrapExchangeRate> {
    if (!blockNumber) {
      const getSpotPriceByAddress = await this.getSpotPriceByAddress({
        tokenAddresses: tokenMetadata.address,
        chainId: this.chainId,
      })

      if (getSpotPriceByAddress) {
        const priceAdapterPrice = BigInt(
          getSpotPriceByAddress.price *
            10 **
              priceAdapterConfig[
                this.chainId as keyof typeof priceAdapterConfig
              ].decimals,
        )

        return {
          name: tokenMetadata.name,
          decimals: tokenMetadata.decimals,
          symbol: tokenMetadata.symbol,
          address: tokenMetadata.address,
          baseRate: 1,
          type: 'protocol',
          tokens: [
            {
              type: TokenType.Underlying,
              underlyingRateRaw: priceAdapterPrice,
              decimals:
                priceAdapterConfig[
                  this.chainId as keyof typeof priceAdapterConfig
                ].decimals,
              name: USD,
              symbol: USD,
              address: USD,
            },
          ],
        }
      }
    }

    const [erc20TokenPriceInEth, ethPriceUSD] = await Promise.all([
      this.getTokenPriceInEth({
        tokenIn: tokenMetadata.address,
        blockNumber,
      }),
      this.getEthUsdPriceFromChainlink(blockNumber),
    ])

    const denominator = 10 ** (18 - tokenMetadata.decimals) // eth decimals
    const price = erc20TokenPriceInEth / BigInt(denominator)

    const tokenPriceInUSD = this.calculateERC20PriceInUsd({
      erc20TokenPriceInEth: price,
      ethPriceUSD,
    })

    return {
      name: tokenMetadata.name,
      decimals: tokenMetadata.decimals,
      symbol: tokenMetadata.symbol,
      address: tokenMetadata.address,
      baseRate: 1,
      type: 'protocol',
      tokens: [
        {
          type: TokenType.Underlying,
          underlyingRateRaw: BigInt(tokenPriceInUSD.toString()),
          decimals:
            priceAdapterConfig[this.chainId as keyof typeof priceAdapterConfig]
              .decimals,
          name: USD,
          symbol: USD,
          address: USD,
        },
      ],
    }
  }

  private calculateERC20PriceInUsd({
    erc20TokenPriceInEth,
    ethPriceUSD,
  }: {
    erc20TokenPriceInEth: bigint
    ethPriceUSD: bigint
  }): bigint {
    const chainId = this.chainId as keyof typeof priceAdapterConfig // Add this line
    return (
      (erc20TokenPriceInEth * ethPriceUSD) /
      BigInt(Math.pow(10, priceAdapterConfig[chainId].chainlinkDecimals)) // Update this line
    )
  }

  private async getTokenPriceInEth({
    tokenIn,
    blockNumber,
  }: {
    tokenIn: string
    blockNumber?: number
  }) {
    const isNativeToken = nativeTokenAddresses.includes(getAddress(tokenIn))

    if (isNativeToken) {
      // switch to chains wrap token
      tokenIn =
        priceAdapterConfig[this.chainId as keyof typeof priceAdapterConfig]
          .wrappedToken.address
    }

    const oneInchOracle = OneInchOracle__factory.connect(
      priceAdapterConfig[this.chainId as keyof typeof priceAdapterConfig]
        .oracle,
      this.provider,
    )

    const wrappedEthAddress =
      priceAdapterConfig[this.chainId as keyof typeof priceAdapterConfig]
        .wrappedEth

    if (wrappedEthAddress === getAddress(tokenIn)) {
      return BigInt(10 ** 18)
    }

    return await oneInchOracle.getRate(tokenIn, wrappedEthAddress, false, {
      blockTag: blockNumber,
    })
  }
}
