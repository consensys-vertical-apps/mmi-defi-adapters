import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/utils/customJsonRpcProvider'
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
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'
import { promises as fs } from 'fs'

import tokenMetadata from '../../../../core/metadata/token-metadata-ethereum.json'
import { ChainLink__factory } from '../../contracts'
import path from 'path'
import { bigintJsonStringify } from '../../../../core/utils/bigintJson'

export class PricesPricesAdapter implements IProtocolAdapter, IMetadataBuilder {
  productId = 'prices'
  protocolId: Protocol
  chainId: Chain

  private provider: CustomJsonRpcProvider

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
  adaptersController: AdaptersController

  async getPrices() {
    try {
      console.log('Getting prices')
      const Denominations = {
        USD: '0x0000000000000000000000000000000000000348',
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      }
      const contract = ChainLink__factory.connect(
        '0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf',
        this.provider,
      )

      const hasPrice: any = []
      const noPrices: string[] = []

      await Promise.all(
        Object.keys(tokenMetadata).map(async (tokenAddress) => {
          const priceResult = await contract
            .latestRoundData(tokenAddress, Denominations.USD)
            .catch(() => {
              return undefined
            })

          if (!priceResult || !priceResult.answer) {
            noPrices.push(
              tokenMetadata[tokenAddress as keyof typeof tokenMetadata]?.name,
            )

            return
          }

          const date = new Date(Number(priceResult?.updatedAt) * 1000)

          const humanReadableDate = date?.toLocaleString() // Converts to a string in local date and time format

          hasPrice.push({
            name: tokenMetadata[tokenAddress as keyof typeof tokenMetadata]
              ?.name,
            price: priceResult?.answer,
            updatedAt: humanReadableDate,
          })

          return true
        }),
      )

      const output = {
        hasPrice: hasPrice,
        noPrices: noPrices,
      }

      console.log(output)

      const newFilePath = path.resolve(
        `src/adapters/${this.protocolId}/products/${this.productId}/prices.json`,
      )

      await fs.writeFile(newFilePath, bigintJsonStringify(output), 'utf-8')
    } catch (error) {
      console.log(error)
      console.log('Whole thing throwing')
    }
  }

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

  /**
   * Update me.
   * Add logic to build protocol token metadata
   * For context see dashboard example ./dashboard.png
   * We need protocol token names, decimals, and also linked underlying tokens
   */
  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    throw new NotImplementedError()

    return {}
  }

  /**
   * Update me.
   * Returning an array of your protocol tokens.
   */
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to get userAddress positions in your protocol
   */
  async getPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
    await this.getPrices()

    console.log('finished getting prices')

    return []
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

  /**
   * Update me.
   * Add logic to calculate the underlying token rate of 1 protocol token
   */
  async getProtocolTokenToUnderlyingTokenRate(
    _input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate> {
    throw new NotImplementedError()
  }

  /**
   * Update me.
   * Add logic to calculate the users profits
   */
  async getProfits(_input: GetProfitsInput): Promise<ProfitsWithRange> {
    throw new NotImplementedError()
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }
}
