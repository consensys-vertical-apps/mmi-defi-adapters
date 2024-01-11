import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/utils/customJsonRpcProvider'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import {
  ProtocolAdapterParams,
  ProtocolDetails,
  PositionType,
  GetPositionsInput,
  GetEventsInput,
  MovementsByBlock,
  GetTotalValueLockedInput,
  GetApyInput,
  GetAprInput,
  GetConversionRateInput,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenUnderlyingRate,
  ProtocolTokenTvl,
  ProtocolPosition,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'
import { COINGECKO_CHAIN_ID } from '../../common/coingecko-chain-id'
import COINGECKO_LIST from '../../common/coingecko-list.json'
import { ChainLink__factory, UniswapQuoter__factory } from '../../contracts'
import { priceAdapterConfig } from './priceAdapterConfig'

type Erc20MetadataForEthBaseTokens = Erc20Metadata & {
  isBaseTokenEth: true
}

type Erc20MetadataForNonEthBaseTokens = Erc20Metadata & {
  isBaseTokenEth: false
  uniswapFee: number
  baseAddress: string
  quoteAddress: string
}

type PriceMetadata = Record<
  string,
  Erc20MetadataForEthBaseTokens | Erc20MetadataForNonEthBaseTokens
>

// We are using uniswap pools to find the prices in ETH, which then gets converted to USD using Chainlink's USD vs ETH feeds
// To get prices from uniswap we need:
// 1) base token
// 2) quote token (weth)
// 3) fee tiers 1%, 0.3%, 0.05%, and 0.01%

export class PricesUSDAdapter implements IProtocolAdapter, IMetadataBuilder {
  productId = 'usd'
  protocolId: Protocol
  chainId: Chain

  private provider: CustomJsonRpcProvider

  private fromIdToCoingeckoId: Record<string, string>

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController

    this.fromIdToCoingeckoId = COINGECKO_CHAIN_ID.reduce(
      (acc, info) => {
        if (!info?.chain_identifier || !info.id) {
          return acc
        }
        return { [info.chain_identifier]: info.id, ...acc }
      },
      {} as Record<string, string>,
    )
  }
  adaptersController: AdaptersController

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Prices',
      description: 'Prices defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.FiatPrices,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    const metadata: PriceMetadata = {}
    const wethAddress = priceAdapterConfig.wrappedEth.addresses[this.chainId]
    const chainId = this
      .chainId as keyof typeof priceAdapterConfig.nativeToken.details

    const wrappedTokenForChain =
      priceAdapterConfig.nativeToken.details[chainId].wrappedToken

    // Step 1: Support native tokens e.g. ETH or Matic
    priceAdapterConfig.nativeToken.addresses.forEach(async (address) => {
      const nativeToken = priceAdapterConfig.nativeToken.details?.[chainId]

      if (!nativeToken) {
        return
      }

      const isEth = wethAddress == wrappedTokenForChain.address

      if (isEth) {
        metadata[address] = {
          ...nativeToken.wrappedToken,
          address,
          isBaseTokenEth: true,
        }
      } else {
        try {
          const fee: number = await this.findFee({
            baseAddress: address,
            quoteAddress: wethAddress,
            decimals: wrappedTokenForChain.decimals,
          })

          metadata[address] = {
            ...nativeToken.wrappedToken,
            address,
            uniswapFee: fee,
            baseAddress: address,
            quoteAddress: wethAddress,
            isBaseTokenEth: false,
          }
        } catch (error) {
          return
        }
      }
    })

    // Step 2: Add this chains wrapped eth details

    metadata[priceAdapterConfig.wrappedEth.addresses[chainId]] = {
      name: priceAdapterConfig.wrappedEth.name,
      symbol: priceAdapterConfig.wrappedEth.symbol,
      decimals: priceAdapterConfig.wrappedEth.decimals,
      address: priceAdapterConfig.wrappedEth.addresses[chainId],
      isBaseTokenEth: true,
    }

    // Step 3: Support all other tokens
    const promises = COINGECKO_LIST?.map(async (token) => {
      if (!token.platforms) {
        return
      }

      const address =
        token.platforms[this.fromIdToCoingeckoId[chainId] as string]

      if (!address) {
        return
      }

      let tokenDetails
      try {
        tokenDetails = await getTokenMetadata(
          address,
          this.chainId,
          this.provider,
        )
      } catch (error) {
        return
      }

      try {
        const fee: number = await this.findFee({
          baseAddress: address,
          quoteAddress: wethAddress,
          decimals: tokenDetails.decimals,
        })

        metadata[address] = {
          ...tokenDetails,
          uniswapFee: fee,
          baseAddress: address,
          quoteAddress: wethAddress,
          isBaseTokenEth: false,
        }
      } catch (error) {
        return
      }
    })

    await Promise.all(promises)

    return metadata
  }

  async findFee({
    baseAddress,
    quoteAddress,
    decimals,
  }: {
    baseAddress: string
    quoteAddress: string
    decimals: number
  }): Promise<number> {
    const fees = [10000, 3000, 500, 100] // Uniswap feeds

    for (const fee of fees) {
      try {
        await this.quoteExactInputSingleCall({
          tokenIn: baseAddress,
          tokenOut: quoteAddress,
          amountOut: BigInt(Math.pow(10, decimals)),

          blockNumber: undefined,
          fee: fee,
        })

        return fee
      } catch (error) {
        continue
      }
    }

    throw new Error('All requests failed')
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    const result = Object.values(await this.buildMetadata()).map(
      ({ address, decimals, name, symbol }) => {
        return { address, decimals, name, symbol }
      },
    )

    return result
  }

  async getPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
    throw new NotImplementedError()
  }

  async getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  async getProtocolTokenToUnderlyingTokenRate({
    blockNumber,
    protocolTokenAddress,
  }: GetConversionRateInput): Promise<ProtocolTokenUnderlyingRate> {
    // We map the native token to the wrapped token
    const tokenDetails = await this.fetchPoolMetadata(protocolTokenAddress)

    let erc20TokenPriceInEth: bigint
    if (tokenDetails.isBaseTokenEth) {
      erc20TokenPriceInEth = BigInt(Math.pow(10, 18))
    } else {
      erc20TokenPriceInEth = await this.quoteExactInputSingleCall({
        tokenIn: tokenDetails.baseAddress,
        tokenOut: tokenDetails.quoteAddress,
        amountOut: BigInt(Math.pow(10, tokenDetails.decimals)),
        blockNumber,
        fee: tokenDetails.uniswapFee,
      })
    }

    const tokenPriceInUSD = this.calculateERC20PriceInUsd({
      erc20TokenPriceInEth: erc20TokenPriceInEth as bigint,
      ethPriceUSD: await this.getEthUsdPriceFromChainlink(blockNumber),
    })

    return {
      name: tokenDetails.name,
      decimals: tokenDetails.decimals,
      symbol: tokenDetails.symbol,
      address: protocolTokenAddress,
      baseRate: 1,
      type: 'protocol',
      tokens: [
        {
          type: TokenType.Fiat,
          underlyingRateRaw: BigInt(tokenPriceInUSD.toString()),
          decimals: priceAdapterConfig.decimals,
          name: 'USD',
          symbol: 'USD',
          address: 'TheUnitedStatesMint',
        },
      ],
    }
  }

  private async getEthUsdPriceFromChainlink(blockNumber: number | undefined) {
    const usdFeed = ChainLink__factory.connect(
      priceAdapterConfig.chainlink.UsdEthFeedAddresses[this.chainId],
      this.provider,
    )

    const ethPriceUSD = await usdFeed.latestRoundData({
      blockTag: blockNumber,
    })
    return ethPriceUSD.answer
  }

  private calculateERC20PriceInUsd({
    erc20TokenPriceInEth,
    ethPriceUSD,
  }: {
    erc20TokenPriceInEth: bigint
    ethPriceUSD: bigint
  }): bigint {
    return (
      (erc20TokenPriceInEth * ethPriceUSD) /
      BigInt(Math.pow(10, priceAdapterConfig.chainlink.decimals))
    )
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  private async quoteExactInputSingleCall({
    tokenIn,
    tokenOut,
    amountOut,

    blockNumber,
    fee,
  }: {
    tokenIn: string
    tokenOut: string
    amountOut: bigint

    blockNumber?: number
    fee: number
  }) {
    const uniswapQuoter = UniswapQuoter__factory.connect(
      priceAdapterConfig.uniswap.quoterContractAddresses[
        this
          .chainId as keyof typeof priceAdapterConfig.uniswap.quoterContractAddresses
      ],
      this.provider,
    )
    return await uniswapQuoter.quoteExactInputSingle.staticCall(
      tokenIn,
      tokenOut,
      fee,
      amountOut,
      0,
      {
        blockTag: blockNumber,
      },
    )
  }
}
