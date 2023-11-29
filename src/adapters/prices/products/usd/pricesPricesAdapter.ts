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
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'
import { promises as fs } from 'fs'

import tokenMetadata from '../../../../core/metadata/token-metadata-ethereum.json'
import { ChainLink__factory } from '../../contracts'
import path from 'path'
import { bigintJsonStringify } from '../../../../core/utils/bigintJson'
import { COINGECKO_LIST } from '../../common/coingecko-list'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { logger } from '../../../../core/utils/logger'

const Denominations = {
  USD: '0x0000000000000000000000000000000000000348',
  ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
}

const WBTC = {
  address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  name: 'Wrapped BTC',
  symbol: 'WBTC',
  decimals: 8,
  iconUrl:
    'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/wbtc.svg',
}
const WETH = {
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  name: 'Wrapped Ether',
  symbol: 'WETH',
  decimals: 18,
  iconUrl:
    'https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png',
}

const NATIVE_ETH = {
  address: '0x0000000000000000000000000000000000000000',
  name: 'Ethereum',
  symbol: 'ETH',
  decimals: 18,
}

const TOKEN_BASEID_MAPPING = {
  [WETH.address.toLowerCase()]: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  [ZERO_ADDRESS.toLowerCase()]: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  [WBTC.address.toLowerCase()]: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
}

const CHAINLINK_RESOLVER_ADDRESS_MAINNET =
  '0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf'

type PriceMetadata = Record<string, Erc20Metadata & { baseAssetId: string }>

export class PricesUSDAdapter implements IProtocolAdapter, IMetadataBuilder {
  productId = 'usd'
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

  /**
   * Update me.
   * Add logic to build protocol token metadata
   * For context see dashboard example ./dashboard.png
   * We need protocol token names, decimals, and also linked underlying tokens
   */
  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    const contract = ChainLink__factory.connect(
      '0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf',
      this.provider,
    )

    const result: PriceMetadata = {
      [NATIVE_ETH.address]: {
        ...NATIVE_ETH,
        baseAssetId: TOKEN_BASEID_MAPPING[NATIVE_ETH.address]!,
      },
    }
    const promises = []

    for (let i = 0; i < COINGECKO_LIST.length; i++) {
      const tokenAddress = COINGECKO_LIST[i].platforms.ethereum

      if (!tokenAddress) {
        continue
      }

      // Wrap the logic in an immediately-invoked async function to handle async operations
      promises.push(
        (async () => {
          try {
            const feed =
              TOKEN_BASEID_MAPPING[tokenAddress.toLowerCase()] ?? tokenAddress

            const priceResult = await contract.latestRoundData(
              feed,
              Denominations.USD,
            )

            if (!priceResult || !priceResult.answer) {
              return // Use return instead of continue in async function
            }

            const name = COINGECKO_LIST[i].name
            const symbol = COINGECKO_LIST[i].symbol

            const decimals = await contract.decimals(feed, Denominations.USD)

            result[tokenAddress] = {
              name,
              address: tokenAddress,
              symbol: symbol,
              decimals: Number(decimals),
              baseAssetId: feed,
            }
          } catch (error) {
            // Handle or log error if necessary
          }
        })(),
      )
    }

    // Wait for all promises to resolve
    await Promise.all(promises)

    // delete liquid staked eth
    const stETH = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84'
    delete result[stETH]

    return result
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ address, decimals, name, symbol }) => {
        return { address, decimals, name, symbol }
      },
    )
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

  async getProtocolTokenToUnderlyingTokenRate({
    blockNumber,
    protocolTokenAddress,
  }: GetConversionRateInput): Promise<ProtocolTokenUnderlyingRate> {
    const chainlinkDetails = await this.fetchPoolMetadata(protocolTokenAddress)

    const contract = ChainLink__factory.connect(
      CHAINLINK_RESOLVER_ADDRESS_MAINNET,
      this.provider,
    )

    const priceResult = await contract.latestRoundData(
      chainlinkDetails.baseAssetId,
      Denominations.USD,
      {
        blockTag: blockNumber,
      },
    )

    return {
      name: chainlinkDetails.name,
      decimals: chainlinkDetails.decimals,
      symbol: chainlinkDetails.symbol,
      address: protocolTokenAddress,
      baseRate: 1,
      type: 'protocol',
      tokens: [
        {
          type: TokenType.Fiat,
          underlyingRateRaw: priceResult.answer,
          decimals: chainlinkDetails.decimals,
          name: 'USD',
          symbol: 'USD',
          address: 'TheUnitedStatesMint',
        },
      ],
    }
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
