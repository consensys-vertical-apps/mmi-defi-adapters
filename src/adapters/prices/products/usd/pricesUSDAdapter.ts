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
  GetProfitsInput,
  GetApyInput,
  GetAprInput,
  GetConversionRateInput,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenUnderlyingRate,
  ProfitsWithRange,
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

type PriceMetadata = Record<string, Erc20Metadata>

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
      positionType: PositionType.Supply,
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

    // support native tokens
    priceAdapterConfig.nativeToken.addresses.forEach((address) => {
      const token =
        priceAdapterConfig.nativeToken.details?.[
          this.chainId as keyof typeof priceAdapterConfig.nativeToken.details
        ]

      if (!token) {
        return
      }

      metadata[address] = { ...token.wrappedToken, address }
    })

    const promises = COINGECKO_LIST?.map(async (token) => {
      if (!token.platforms) {
        return
      }

      const address =
        token.platforms[this.fromIdToCoingeckoId[this.chainId] as string]

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

      metadata[address] = {
        ...tokenDetails,
      }
    })

    await Promise.all(promises)

    return metadata
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
    const isNativeToken =
      priceAdapterConfig.nativeToken.addresses.includes(protocolTokenAddress)

    // We map the native token to the wrapped token
    const tokenDetails = isNativeToken
      ? priceAdapterConfig.nativeToken.details[
          this.chainId as keyof typeof priceAdapterConfig.nativeToken.details
        ].wrappedToken
      : await this.fetchPoolMetadata(protocolTokenAddress)

    const wethAddress = priceAdapterConfig.wrappedEth.addresses[this.chainId]

    const isEth = wethAddress == tokenDetails.address

    const erc20TokenPriceInEth = isEth
      ? BigInt(Math.pow(10, 18)) // eth price in eth is 1 to 1
      : await this.quoteExactInputSingleCall({
          tokenIn: tokenDetails.address,
          tokenOut: wethAddress,
          amountOut: BigInt(Math.pow(10, tokenDetails.decimals)),
          sqrtPriceLimitX96: 0,
          blockNumber,
        })

    if (!erc20TokenPriceInEth) {
      throw new Error('Could not get token price in eth')
    }

    const contract = ChainLink__factory.connect(
      priceAdapterConfig.chainlink.UsdEthFeedAddresses[this.chainId],
      this.provider,
    )

    const ethPriceUSD = await contract.latestRoundData({
      blockTag: blockNumber,
    })

    const tokenPriceInUSD = this.calculateERC20PriceInUsd({
      erc20TokenPriceInEth: erc20TokenPriceInEth as bigint,
      ethPriceUSD: ethPriceUSD.answer,
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

  async getProfits(_input: GetProfitsInput): Promise<ProfitsWithRange> {
    throw new NotImplementedError()
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
    sqrtPriceLimitX96,
    blockNumber,
  }: {
    tokenIn: string
    tokenOut: string
    amountOut: bigint
    sqrtPriceLimitX96: number
    blockNumber?: number
  }) {
    const uniswapQuoter = UniswapQuoter__factory.connect(
      priceAdapterConfig.uniswap.quoterContractAddresses[
        this
          .chainId as keyof typeof priceAdapterConfig.uniswap.quoterContractAddresses
      ],
      this.provider,
    )

    // Note: UNISWAP has different pools per fee
    // We look for at two different pools to find a price
    // We may want to search for more pools in future
    // First we try with fee = 10000
    return await uniswapQuoter.quoteExactInputSingle
      .staticCall(tokenIn, tokenOut, 10000, amountOut, sqrtPriceLimitX96, {
        blockTag: blockNumber,
      })
      .catch(async () => {
        // Second we try with fee = 3000
        return await uniswapQuoter.quoteExactInputSingle.staticCall(
          tokenIn,
          tokenOut,
          3000,
          amountOut,
          sqrtPriceLimitX96,
          {
            blockTag: blockNumber,
          },
        )
      })
      .catch(() => {
        logger.debug(
          { chainId: this.chainId, token: tokenIn },
          'Unable to get price',
        )

        return false
      })
  }
}
