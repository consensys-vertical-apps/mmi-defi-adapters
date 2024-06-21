import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../../core/decorators/cacheToFile'

import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'

import { Helpers } from '../../../../scripts/helpers'
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
import { fetchAllMarkets } from '../../backend/backendSdk'

import { logger } from '../../../../core/utils/logger'
import { OraclePyYtLp__factory } from '../../contracts'

const TokenTypes = {
  YieldToken: 'yieldToken',
  PrincipalToken: 'principleToken',
  LpToken: 'lpToken',
  StandardisedYieldToken: 'standardisedYieldToken',
} as const
export type TokenTypes = (typeof TokenTypes)[keyof typeof TokenTypes]

type Metadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
    marketAddress: string
    type: TokenTypes
  }
>

const PENDLE_ORACLE_ADDRESS_ALL_CHAINS =
  '0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2'

// I don't know what these values mean - JP
const DURATION_15_MINS = 900
const DURATION_30_MINS = 1800
export class PendleMarketAdapter implements IProtocolAdapter, IMetadataBuilder {
  productId = 'market'
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  private provider: CustomJsonRpcProvider

  adaptersController: AdaptersController

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
    helpers,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
    this.helpers = helpers
  }

  async unwrap({
    blockNumber,
    protocolTokenAddress,
    tokenId,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    const metadata = await this.fetchPoolMetadata(protocolTokenAddress)
    const underlyingToken = metadata.underlyingToken

    const oracle = OraclePyYtLp__factory.connect(
      PENDLE_ORACLE_ADDRESS_ALL_CHAINS,
      this.provider,
    )

    let rate: bigint
    switch (metadata.type) {
      case 'principleToken':
        rate = await oracle
          .getPtToSyRate(metadata.marketAddress, DURATION_15_MINS, {
            blockTag: blockNumber,
          })
          .catch((e) => {
            return oracle.getYtToSyRate(
              metadata.marketAddress,
              DURATION_30_MINS,
              {
                blockTag: blockNumber,
              },
            )
          })
          .catch((e) => {
            return 10n ** 18n
          })

        break
      case 'yieldToken':
        rate = await oracle
          .getYtToSyRate(metadata.marketAddress, DURATION_15_MINS, {
            blockTag: blockNumber,
          })
          .catch((e) => {
            return oracle.getYtToSyRate(
              metadata.marketAddress,
              DURATION_30_MINS,
              {
                blockTag: blockNumber,
              },
            )
          })
          .catch((e) => {
            return 10n ** 18n
          })

        break
      case 'lpToken':
        rate = await oracle
          .getPtToSyRate(metadata.marketAddress, DURATION_15_MINS, {
            blockTag: blockNumber,
          })
          .catch((e) => {
            return oracle.getYtToSyRate(
              metadata.marketAddress,
              DURATION_30_MINS,
              {
                blockTag: blockNumber,
              },
            )
          })
          .catch((e) => {
            return 10n ** 18n
          })

        break
      case 'standardisedYieldToken': {
        rate = 10n ** 18n

        break
      }
    }

    const underlying = {
      type: TokenType.Underlying,

      underlyingRateRaw: rate,
      ...underlyingToken,
    }

    return {
      baseRate: 1,
      type: TokenType.Protocol,
      ...metadata.protocolToken,
      tokens: [underlying],
    }
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Pendle',
      description: 'Pendle Market adapter',
      siteUrl: 'https://www.pendle.finance',
      iconUrl: 'https://app.pendle.finance/favicon.ico',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'market' })
  async buildMetadata(): Promise<Metadata> {
    const resp = await fetchAllMarkets(this.chainId)

    const metadata: Metadata = {}

    resp.results.map((value) => {
      const market = getAddress(value.address)

      const pt: Erc20Metadata = {
        address: getAddress(value.pt.address),
        name: value.pt.name,
        symbol: value.pt.symbol,
        decimals: value.pt.decimals,
      }
      const yt: Erc20Metadata = {
        address: getAddress(value.yt.address),
        name: value.yt.name,
        symbol: value.yt.symbol,
        decimals: value.yt.decimals,
      }
      const lp: Erc20Metadata = {
        address: getAddress(value.lp.address),
        name: value.lp.name,
        symbol: value.lp.symbol,
        decimals: value.lp.decimals,
      }
      const underlyingAsset: Erc20Metadata = {
        address: getAddress(value.underlyingAsset.address),
        name: value.underlyingAsset.name,
        symbol: value.underlyingAsset.symbol,
        decimals: value.underlyingAsset.decimals,
      }
      const sy: Erc20Metadata = {
        address: getAddress(value.sy.address),
        name: value.sy.name,
        symbol: value.sy.symbol,
        decimals: value.underlyingAsset.decimals,
      }

      metadata[getAddress(pt.address)] = {
        protocolToken: pt,
        underlyingToken: sy,
        marketAddress: market,
        type: 'principleToken',
      }
      metadata[getAddress(yt.address)] = {
        protocolToken: yt,
        underlyingToken: sy,
        marketAddress: market,
        type: 'yieldToken',
      }
      metadata[getAddress(sy.address)] = {
        protocolToken: sy,
        underlyingToken: underlyingAsset,
        marketAddress: market,
        type: 'standardisedYieldToken',
      }

      metadata[getAddress(lp.address)] = {
        protocolToken: lp,
        underlyingToken: underlyingAsset,
        marketAddress: market,
        type: 'lpToken',
      }

      return
    })

    return metadata
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  async getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return this.helpers.getBalanceOfTokens({
      ...input,
      protocolTokens: await this.getProtocolTokens(),
    })
  }

  private async getProtocolToken(protocolTokenAddress: string) {
    return (await this.fetchPoolMetadata(protocolTokenAddress)).protocolToken
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error(
        {
          protocolTokenAddress,
          protocol: this.protocolId,
          chainId: this.chainId,
          product: this.productId,
        },
        'Protocol token pool not found',
      )
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

  async getWithdrawals({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.withdrawals({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getDeposits({
    protocolTokenAddress,
    fromBlock,
    toBlock,
    userAddress,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.helpers.deposits({
      protocolToken: await this.getProtocolToken(protocolTokenAddress),
      filter: { fromBlock, toBlock, userAddress },
    })
  }

  async getTotalValueLocked({
    protocolTokenAddresses,
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const protocolTokens = await this.getProtocolTokens()

    return await this.helpers.tvl({
      protocolTokens,
      filterProtocolTokenAddresses: protocolTokenAddresses,
      blockNumber,
    })
  }
}
