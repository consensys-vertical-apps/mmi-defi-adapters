import { getAddress } from 'ethers'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { Helpers } from '../../../../scripts/helpers'
import {
  ProtocolAdapterParams,
  ProtocolDetails,
  PositionType,
  GetPositionsInput,
  GetEventsInput,
  MovementsByBlock,
  GetTotalValueLockedInput,
  ProtocolTokenTvl,
  ProtocolPosition,
  AssetType,
  TokenType,
  GetRewardPositionsInput,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'
import { fetchAllAssets, fetchAllMarkets } from '../../backend/backendSdk'
import { PendleChain } from '../../common/common'
import { Market__factory, PendleErc20__factory } from '../../contracts'

type PendleMarketMetadataValue = {
  market: string
  chainId: PendleChain
  name: string
  pt: Erc20Metadata
  yt: Erc20Metadata
  lp: Erc20Metadata
}
type PendleMarketMetadata = Record<string, PendleMarketMetadataValue>

export class PendleMarketAdapter implements IProtocolAdapter, IMetadataBuilder {
  productId = 'market'
  protocolId: Protocol
  chainId: Chain

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

  helpers?: Helpers | undefined

  unwrap(input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new Error('Method not implemented.')
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
        type: AssetType.NonStandardErc20,
      },
    }
  }

  @CacheToFile({ fileKey: 'market' })
  async buildMetadata(): Promise<PendleMarketMetadata> {
    const resp = await fetchAllMarkets(this.chainId as PendleChain)
    const res = Object.fromEntries(
      resp.results.map((value) => {
        const market = getAddress(value.address)
        const chainId = value.chainId as PendleChain
        const name = value.name
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
        return [
          market,
          {
            market,
            chainId,
            name,
            pt,
            yt,
            lp,
          },
        ]
      }),
    )

    return res
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    const markets = Object.values(await this.buildMetadata())
    return markets.map((markets) => markets.lp)
  }

  async createPriceLookUpMap(): Promise<Record<string, bigint>> {
    const allAssets = await fetchAllAssets(this.chainId as PendleChain)
    const priceLookUpMap: Record<string, bigint> = {}
    allAssets.forEach((asset) => {
      const price = BigInt(
        Math.round((asset.price?.usd ?? 0) * 10 ** asset.decimals),
      )
      priceLookUpMap[asset.address] = price
    })
    return priceLookUpMap
  }

  async getMetadata(
    protocolTokenAddresses?: string[],
  ): Promise<PendleMarketMetadataValue[]> {
    const allMetadata = await this.buildMetadata()

    if (protocolTokenAddresses && protocolTokenAddresses.length > 0) {
      const filteredPools: PendleMarketMetadataValue[] = []
      protocolTokenAddresses.forEach((address) => {
        //@ts-ignore
        filteredPools.push(allMetadata[address])
      })

      return filteredPools
    }

    return Object.values(allMetadata)
  }

  async getPositions({
    userAddress,
    protocolTokenAddresses,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const [markets, priceLookUpMap] = await Promise.all([
      this.getMetadata(protocolTokenAddresses),
      this.createPriceLookUpMap(),
    ])

    const positions: ProtocolPosition[] = await Promise.all(
      markets.map(async (value) => {
        const marketContract = Market__factory.connect(
          value.market,
          this.provider,
        )
        const ptContract = PendleErc20__factory.connect(
          value.pt.address,
          this.provider,
        )
        const ytContract = PendleErc20__factory.connect(
          value.yt.address,
          this.provider,
        )
        const [
          lpBalance,
          ptBalance,
          ytBalance,
          lpMetadata,
          ptMetadata,
          ytMetadata,
        ] = await Promise.all([
          marketContract.balanceOf(userAddress),
          ptContract.balanceOf(userAddress),
          ytContract.balanceOf(userAddress),
          getTokenMetadata(value.lp.address, value.chainId, this.provider),
          getTokenMetadata(value.pt.address, value.chainId, this.provider),
          getTokenMetadata(value.yt.address, value.chainId, this.provider),
        ])
        return {
          ...lpMetadata,
          type: TokenType.Protocol,
          balanceRaw: lpBalance,
          tokens: [
            {
              type: TokenType.Underlying,

              balanceRaw: ptBalance,
              priceRaw: priceLookUpMap[value.pt.address],
              ...ptMetadata,
            },
            {
              type: TokenType.Underlying,
              balanceRaw: ytBalance,
              priceRaw: priceLookUpMap[value.yt.address],
              ...ytMetadata,
            },
            {
              type: TokenType.Underlying,
              balanceRaw: lpBalance,
              priceRaw: priceLookUpMap[value.lp.address],
              ...lpMetadata,
            },
          ],
        }
      }),
    )
    return positions.filter((pos) => {
      const hasBalances = pos.tokens?.some((token) => {
        return token.balanceRaw !== 0n
      })
      return hasBalances
    })
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
}
