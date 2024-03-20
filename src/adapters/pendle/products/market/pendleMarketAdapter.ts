import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import {
  IMetadataBuilder,
  CacheToFile,
} from '../../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
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
  AssetType,
  TokenType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'
import { fetchAllAssets, fetchAllMarkets } from '../../backend/backendSdk'
import { PendleChain } from '../../common/common'
import { Market__factory, PendleErc20__factory } from '../../contracts'

type PendleMarketMetadata = Record<
  string,
  {
    market: string
    chainId: PendleChain
    name: string
    pt: Erc20Metadata
    yt: Erc20Metadata
    lp: Erc20Metadata
  }
>

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

  /**
   * Update me.
   * Add your protocol details
   */
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Pendle',
      description: 'Pendle Market adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.NonStandardErc20,
      },
    }
  }

  /**
   * Update me.
   * Add logic to build protocol token metadata
   * For context see dashboard example ./dashboard.png
   * We need protocol token names, decimals, and also linked underlying tokens
   */
  @CacheToFile({ fileKey: 'market' })
  async buildMetadata(): Promise<PendleMarketMetadata> {
    const resp = await fetchAllMarkets(this.chainId as PendleChain)
    const res = Object.fromEntries(
      resp.results.map((value) => {
        const market = value.address
        const chainId = value.chainId as PendleChain
        const name = value.name
        const pt: Erc20Metadata = {
          address: value.pt.address,
          name: value.pt.name,
          symbol: value.pt.symbol,
          decimals: value.pt.decimals,
        }
        const yt: Erc20Metadata = {
          address: value.yt.address,
          name: value.yt.name,
          symbol: value.yt.symbol,
          decimals: value.yt.decimals,
        }
        const lp: Erc20Metadata = {
          address: value.lp.address,
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

  /**
   * Update me.
   * Returning an array of your protocol tokens.
   */
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    const markets = Object.values(await this.buildMetadata())
    return markets.map((markets) => markets.lp)
  }

  /**
   * Update me.
   * Add logic to get userAddress positions in your protocol
   */
  async getPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
    const [markets, allAssets] = await Promise.all([
      Object.values(await this.buildMetadata()),
      fetchAllAssets(this.chainId as PendleChain),
    ])
    const priceLookUpMap: Record<string, bigint> = {}
    allAssets.forEach((asset) => {
      const price = BigInt(
        Math.round((asset.price?.usd ?? 0) * 10 ** asset.decimals),
      )
      priceLookUpMap[asset.address] = price
    })
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
          marketContract.balanceOf(_input.userAddress),
          ptContract.balanceOf(_input.userAddress),
          ytContract.balanceOf(_input.userAddress),
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

  /**
   * Update me.
   * Add logic to calculate the underlying token rate of 1 protocol token
   */
  async getProtocolTokenToUnderlyingTokenRate(
    _input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate> {
    throw new NotImplementedError()
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }
}
