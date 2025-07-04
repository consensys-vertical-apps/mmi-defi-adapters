import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { E_ADDRESS } from '../../../../core/constants/E_ADDRESS'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import { Helpers } from '../../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { extractErrorMessage } from '../../../../core/utils/extractErrorMessage'
import { fetchWithRetry } from '../../../../core/utils/fetchWithRetry'
import { logger } from '../../../../core/utils/logger'
import { nativeTokenAddresses } from '../../../../core/utils/nativeTokens'
import {
  AdapterSettings,
  TokenType,
  UnwrapExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { ChainLink__factory, OneInchOracle__factory } from '../../contracts'
import { fiatDecimals, priceAdapterConfig } from './priceV2Config'

export const USD = 'USD'
const BASE_URL = 'https://price-api.metafi.codefi.network'

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
  tokenAddress: string
  vsCurrency?: string
}

export type PricesInput = {
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
  }: PricesInput): Promise<UnwrapExchangeRate>
}

// Project details:
// https://github.com/1inch/spot-price-aggregator

export class PricesV2UsdAdapter implements IPricesAdapter {
  productId = 'usd'
  chainId: Chain
  helpers: Helpers

  adapterSettings: AdapterSettings = {
    includeInUnwrap: false,
    userEvent: false,
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
    tokenAddress,
    vsCurrency = 'usd',
  }: GetSpotPriceByAddressInput): Promise<SpotPrice | null> {
    const url = new URL(
      `${BASE_URL}/v1/chains/${this.chainId}/spot-prices/${
        tokenAddress === E_ADDRESS ? ZERO_ADDRESS : tokenAddress
      }`,
    )
    url.searchParams.append('vsCurrency', vsCurrency)

    logger.info(
      {
        tokenAddress,
        currency: vsCurrency,
        chainId: this.chainId,
        url: url.toString(),
      },
      'Fetching spot prices',
    )

    try {
      const response = await fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok || response.status === 204) {
        throw new Error(
          `Error fetching spot price - ${response.status} - ${response.statusText}`,
        )
      }

      const data: SpotPrice = await response.json()
      return data
    } catch (error) {
      logger.error(
        {
          tokenAddress,
          currency: vsCurrency,
          chainId: this.chainId,
          url: url.toString(),
          error: extractErrorMessage(error),
        },
        'Failed to fetch spot price',
      )
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
      const spotPriceByAddress = await this.getSpotPriceByAddress({
        tokenAddress: tokenMetadata.address,
      })

      if (spotPriceByAddress) {
        const priceAdapterPrice = BigInt(
          spotPriceByAddress.price * 10 ** fiatDecimals,
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
              decimals: fiatDecimals,
              name: USD,
              symbol: USD,
              address: USD,
            },
          ],
        }
      }
    }

    if (!priceAdapterConfig[this.chainId as keyof typeof priceAdapterConfig]) {
      throw new Error(
        `Onchain price adapter config not found for chain ${this.chainId}`,
      )
    }

    logger.info(
      {
        tokenAddress: tokenMetadata.address,
        vsCurrency: USD,
        chainId: this.chainId,
      },
      'Fetching on-chain prices',
    )

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
          decimals: fiatDecimals,
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
