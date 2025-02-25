import { ZeroAddress } from 'ethers'
import { AdaptersController } from '../../../core/adaptersController'
import { Chain } from '../../../core/constants/chains'
import { CacheToDb } from '../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../core/errors/errors'
import { Helpers } from '../../../core/helpers'
import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../core/utils/filters'
import { logger } from '../../../core/utils/logger'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetPositionsInput,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  TokenType,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../types/adapter'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import { Protocol } from '../../protocols'
import { MarketParamsStruct, MarketStruct } from '../contracts/AdaptiveCurveIrm'
import {
  AdaptiveCurveIrm__factory,
  MorphoBlue__factory,
} from '../contracts/factories'
import { MarketParams } from '../internal-utils/Blue'
import { MorphoBlueMath } from '../internal-utils/MorphoBlue.maths'

export type MorphoBlueAdditionalMetadata = {
  tokenId: string
  collateralToken: Erc20Metadata
}

const morphoBlueContractAddresses: Partial<
  Record<Protocol, Partial<Record<Chain, string>>>
> = {
  [Protocol.MorphoBlue]: {
    [Chain.Ethereum]: '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb',
    [Chain.Base]: '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb',
  },
}

export abstract class MorphoBluePoolAdapter implements IProtocolAdapter {
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  abstract productId: string
  abstract adapterSettings: AdapterSettings

  protected _provider: CustomJsonRpcProvider

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
    helpers,
  }: ProtocolAdapterParams) {
    this._provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
    this.helpers = helpers
  }

  __MATH__ = new MorphoBlueMath()

  adaptersController: AdaptersController

  abstract getProtocolDetails(): ProtocolDetails

  @CacheToDb
  async getProtocolTokens(): Promise<
    ProtocolToken<MorphoBlueAdditionalMetadata>[]
  > {
    const morphoBlueContract = MorphoBlue__factory.connect(
      morphoBlueContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    const createMarketFilter = morphoBlueContract.filters.CreateMarket()
    const marketIds = (
      await morphoBlueContract.queryFilter(createMarketFilter, 0, 'latest')
    ).map((event) => event.args.id)

    return await filterMapAsync(marketIds, async (id) => {
      const marketParams: MarketParams =
        await morphoBlueContract.idToMarketParams(id)

      try {
        const [loanTokenData, collateralTokenData] = await Promise.all([
          this.helpers.getTokenMetadata(marketParams.loanToken),
          this.helpers.getTokenMetadata(marketParams.collateralToken),
        ])

        return {
          tokenId: id,
          address: marketParams.loanToken,
          name: loanTokenData.name,
          symbol: loanTokenData.symbol,
          decimals: loanTokenData.decimals,
          underlyingTokens: [loanTokenData],
          collateralToken: collateralTokenData,
        }
      } catch (error) {
        logger.error(
          {
            protocolId: this.protocolId,
            productId: this.productId,
            chainId: this.chainId,
            marketId: id,
            marketParams,
            error: error instanceof Error ? error.message : error,
          },
          'Error fetching token metadata for market id',
        )
        return undefined
      }
    })
  }

  private async getMarketsId(): Promise<string[]> {
    return Object.values(await this.getProtocolTokens()).map(
      ({ tokenId }) => tokenId,
    )
  }

  // get the loan token metadata
  private async _fetchLoanTokenMetadata(id: string): Promise<Erc20Metadata> {
    const {
      underlyingTokens: [underlyingToken],
    } = await this._fetchMarketMetadata(id)

    return underlyingToken!
  }

  // get the collateral token metadata
  private async _fetchCollateralTokenMetadata(
    id: string,
  ): Promise<Erc20Metadata> {
    const { collateralToken } = await this._fetchMarketMetadata(id)
    return collateralToken
  }

  // get the market token metadata
  private async _fetchMarketMetadata(id: string) {
    const lowerCaseId = id.toLowerCase()
    const marketMetadata = (await this.getProtocolTokens()).find(
      ({ tokenId }) => tokenId === lowerCaseId,
    )

    if (!marketMetadata) {
      logger.error({ id: lowerCaseId }, 'id market not found')
      throw new Error('id market not found')
    }

    return marketMetadata
  }

  async getBalance(
    marketId: string,
    userAddress: string,
    blockNumber?: number,
  ): Promise<{
    supplyAmount: bigint
    borrowAmount: bigint
    collateralAmount: bigint
  }> {
    const morphoBlue = MorphoBlue__factory.connect(
      morphoBlueContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    const [
      { supplyShares, borrowShares, collateral: collateralAmount },
      marketData,
      marketParams,
    ] = await Promise.all([
      morphoBlue.position(marketId, userAddress, {
        blockTag: blockNumber,
      }),
      morphoBlue.market(marketId, {
        blockTag: blockNumber,
      }),
      morphoBlue.idToMarketParams(marketId, {
        blockTag: blockNumber,
      }),
    ])

    const irmContract = AdaptiveCurveIrm__factory.connect(
      marketParams.irm,
      this._provider,
    )

    const borrowRate =
      marketParams.irm !== ZeroAddress
        ? await irmContract.borrowRateView(
            [...marketParams] as unknown as MarketParamsStruct,
            [...marketData] as unknown as MarketStruct,
            {
              blockTag: blockNumber,
            },
          )
        : 0n

    const block = await this._provider.getBlock(blockNumber ?? 'latest', false)

    const updatedMarketData = this.__MATH__.accrueInterests(
      BigInt(block!.timestamp),
      {
        totalSupplyAssets: marketData.totalSupplyAssets,
        totalSupplyShares: marketData.totalSupplyShares,
        totalBorrowAssets: marketData.totalBorrowAssets,
        totalBorrowShares: marketData.totalBorrowShares,
        lastUpdate: marketData.lastUpdate,
        fee: marketData.fee,
      }, // Cant pass marketData directly because we get error: Cannot mix BigInt and other types, use explicit conversion
      BigInt(borrowRate),
    )

    const supplyAmount = this.__MATH__.toAssetsDown(
      supplyShares,
      updatedMarketData.totalSupplyAssets,
      updatedMarketData.totalSupplyShares,
    )

    const borrowAmount = this.__MATH__.toAssetsDown(
      borrowShares,
      updatedMarketData.totalBorrowAssets,
      updatedMarketData.totalBorrowShares,
    )

    return {
      supplyAmount,
      borrowAmount,
      collateralAmount,
    }
  }

  async getPositions({
    userAddress,
    blockNumber,
    tokenIds,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const positionType = this.getProtocolDetails().positionType

    const marketsIds = tokenIds ?? (await this.getMarketsId())

    const protocolTokens: ProtocolPosition[] = []

    await filterMapAsync(marketsIds, async (marketId) => {
      const { supplyAmount, borrowAmount, collateralAmount } =
        await this.getBalance(marketId, userAddress, blockNumber)

      const loanMetadata = await this._fetchLoanTokenMetadata(marketId)

      if (collateralAmount > 0n && positionType === PositionType.Supply) {
        const collateralMetadata =
          await this._fetchCollateralTokenMetadata(marketId)

        protocolTokens.push({
          tokenId: marketId,
          ...collateralMetadata,
          balanceRaw: collateralAmount,
          type: TokenType.Protocol,
          tokens: [
            {
              ...collateralMetadata,
              balanceRaw: collateralAmount,
              type: TokenType.Underlying,
            },
          ],
        })
      }
      if (supplyAmount > 0n && positionType === PositionType.Supply) {
        protocolTokens.push({
          tokenId: marketId,
          ...loanMetadata,
          balanceRaw: supplyAmount,
          type: TokenType.Protocol,
          tokens: [
            {
              ...loanMetadata,
              balanceRaw: supplyAmount,
              type: TokenType.Underlying,
            },
          ],
        })
      }
      if (borrowAmount > 0n && positionType === PositionType.Borrow) {
        protocolTokens.push({
          tokenId: marketId,
          ...loanMetadata,
          balanceRaw: borrowAmount,
          type: TokenType.Protocol,
          tokens: [
            {
              ...loanMetadata,
              balanceRaw: borrowAmount,
              type: TokenType.Underlying,
            },
          ],
        })
      }
    })

    return protocolTokens
  }

  // Nothing to do here
  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
