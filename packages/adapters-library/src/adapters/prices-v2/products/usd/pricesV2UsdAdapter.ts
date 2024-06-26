import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { nativeTokenAddresses } from '../../../../core/utils/nativeTokens'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import {
  AssetType,
  GetEventsInput,
  GetPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { ChainLink__factory, OneInchOracle__factory } from '../../contracts'
import { priceAdapterConfig } from './priceV2Config'

export const USD = 'USD'

// Project details:
// https://github.com/1inch/spot-price-aggregator

export class PricesV2UsdAdapter implements IProtocolAdapter {
  productId = 'usd'
  protocolId: Protocol
  chainId: Chain

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: false,
  }

  private provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

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
  }

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'PricesV2',
      description: 'PricesV2 defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  /**
   * Update me.
   * Returning an array of your protocol tokens.
   */
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return [{ address: '', name: '', symbol: '', decimals: 0 }]
  }

  /**
   * Update me.
   * Add logic to get userAddress positions in your protocol
   */
  async getPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to get user's withdrawals per position by block range
   */
  async getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to get user's deposits per position by block range
   */
  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to get tvl in a pool
   *
   */
  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
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

  /**
   * Get rate would be a better name here but as not exposed unwrap is fine for now
   */
  async unwrap({
    blockNumber,
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const [erc20TokenPriceInEth, ethPriceUSD, tokenMetadata] =
      await Promise.all([
        this.getTokenPriceInEth({
          tokenIn: protocolTokenAddress,
          blockNumber,
        }),
        this.getEthUsdPriceFromChainlink(blockNumber),
        getTokenMetadata(protocolTokenAddress, this.chainId, this.provider),
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
