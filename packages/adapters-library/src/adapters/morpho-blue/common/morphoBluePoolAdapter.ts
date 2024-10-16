import { ZeroAddress } from 'ethers'
import { Erc20__factory } from '../../../contracts/factories/Erc20__factory.js'
import type { AdaptersController } from '../../../core/adaptersController.js'
import { Chain } from '../../../core/constants/chains.js'
import { CacheToDb } from '../../../core/decorators/cacheToDb.js'
import { NotImplementedError } from '../../../core/errors/errors.js'
import type { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider.js'
import { filterMapAsync } from '../../../core/utils/filters.js'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata.js'
import { logger } from '../../../core/utils/logger.js'
import type { Helpers } from '../../../scripts/helpers.js'
import type {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../types/IProtocolAdapter.js'
import {
  type AdapterSettings,
  type GetEventsInput,
  type GetPositionsInput,
  type GetTotalValueLockedInput,
  type MovementsByBlock,
  PositionType,
  type ProtocolAdapterParams,
  type ProtocolDetails,
  type ProtocolPosition,
  type ProtocolTokenTvl,
  TokenType,
  type UnwrapExchangeRate,
  type UnwrapInput,
} from '../../../types/adapter.js'
import type { Erc20Metadata } from '../../../types/erc20Metadata.js'
import { Protocol } from '../../protocols.js'
import type {
  MarketParamsStruct,
  MarketStruct,
} from '../contracts/AdaptiveCurveIrm.js'
import type { SupplyEvent } from '../contracts/MorphoBlue.js'
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
} from '../contracts/common.js'
import {
  AdaptiveCurveIrm__factory,
  MorphoBlue__factory,
} from '../contracts/factories/index.js'
import type { MarketData, MarketParams } from '../internal-utils/Blue.js'
import { MorphoBlueMath } from '../internal-utils/MorphoBlue.maths.js'

type AdditionalMetadata = {
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
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
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
          getTokenMetadata(
            marketParams.loanToken,
            this.chainId,
            this._provider,
          ),
          getTokenMetadata(
            marketParams.collateralToken,
            this.chainId,
            this._provider,
          ),
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

  private async _fetchTokenMetadata(
    tokenId: string,
  ): Promise<Erc20Metadata & { tokenId: string }> {
    const tokens = await this.getProtocolTokens()
    const tokenMetadata = tokens.find(
      (token) => token.tokenId.toLowerCase() === tokenId.toLowerCase(),
    )
    if (!tokenMetadata) {
      logger.error({ tokenId }, 'Token metadata not found')
      throw new Error('Token metadata not found')
    }
    return {
      address: tokenMetadata.address,
      name: tokenMetadata.name,
      symbol: tokenMetadata.symbol,
      decimals: tokenMetadata.decimals,
      tokenId: tokenMetadata.tokenId,
    }
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

    const supplyAssets = this.__MATH__.toAssetsDown(
      supplyShares,
      updatedMarketData.totalSupplyAssets,
      updatedMarketData.totalSupplyShares,
    )

    const borrowAssets = this.__MATH__.toAssetsDown(
      borrowShares,
      updatedMarketData.totalBorrowAssets,
      updatedMarketData.totalBorrowShares,
    )

    return {
      supplyAmount: supplyAssets,
      borrowAmount: borrowAssets,
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

  async getWithdrawals({
    userAddress,

    fromBlock,
    toBlock,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return (
      await Promise.all([
        this.getMovements({
          userAddress,

          fromBlock,
          toBlock,
          eventType: 'withdrawn',
          tokenId: tokenId!,
        }),
        this.getMovements({
          userAddress,

          fromBlock,
          toBlock,
          eventType: 'collat-withdrawn',
          tokenId: tokenId!,
        }),
      ])
    ).flat()
  }

  async getDeposits({
    userAddress,

    fromBlock,
    toBlock,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return (
      await Promise.all([
        this.getMovements({
          userAddress,

          fromBlock,
          toBlock,
          eventType: 'supplied',
          tokenId: tokenId!,
        }),
        this.getMovements({
          userAddress,

          fromBlock,
          toBlock,
          eventType: 'collat-supplied',
          tokenId: tokenId!,
        }),
      ])
    ).flat()
  }

  async getBorrows({
    userAddress,

    fromBlock,
    toBlock,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.getMovements({
      userAddress,

      fromBlock,
      toBlock,
      eventType: 'borrowed',
      tokenId: tokenId!,
    })
  }

  async getRepays({
    userAddress,

    fromBlock,
    toBlock,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.getMovements({
      userAddress,

      fromBlock,
      toBlock,
      eventType: 'repaid',
      tokenId: tokenId!,
    })
  }

  async getTotalValueLocked({
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const metadata = await this.getProtocolTokens()
    const morphoBlue = MorphoBlue__factory.connect(
      morphoBlueContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )
    interface Aggregator {
      [tokenAddress: string]: bigint
    }
    const supplyAssetsAggregator: Aggregator = {}
    const borrowAssetsAggregator: Aggregator = {}
    const collateralTokensSet: Set<string> = new Set()
    const marketsIds = await this.getMarketsId()
    for (const marketId of marketsIds) {
      const {
        underlyingTokens: [underlyingToken],
        collateralToken,
      } = metadata.find(({ tokenId }) => tokenId === marketId)!
      const marketData: MarketData = await morphoBlue.market(marketId, {
        blockTag: blockNumber,
      })

      const loanTokenAddress = underlyingToken!.address
      if (loanTokenAddress) {
        supplyAssetsAggregator[loanTokenAddress] =
          (supplyAssetsAggregator[loanTokenAddress] || 0n) +
          marketData.totalSupplyAssets

        borrowAssetsAggregator[loanTokenAddress] =
          (borrowAssetsAggregator[loanTokenAddress] || 0n) +
          marketData.totalBorrowAssets
      }

      const collateralTokenAddress = collateralToken.address
      if (collateralTokenAddress) {
        collateralTokensSet.add(collateralTokenAddress)
      }
    }

    const collateralAggregator: Aggregator = {}

    for (const tokenAddress of collateralTokensSet) {
      const supplyAssets = supplyAssetsAggregator[tokenAddress] || 0n
      const borrowAssets = borrowAssetsAggregator[tokenAddress] || 0n

      const tokenContract = Erc20__factory.connect(tokenAddress, this._provider)
      const morphoBlueBalance = await tokenContract
        .balanceOf(
          morphoBlueContractAddresses[this.protocolId]![this.chainId]!,
          {
            blockTag: blockNumber,
          },
        )
        .catch(() => 0n)

      collateralAggregator[tokenAddress] =
        morphoBlueBalance - (supplyAssets - borrowAssets)
    }
    const positionType = this.getProtocolDetails().positionType
    const tvlResults = []
    const allTokenAddresses = new Set([
      ...Object.keys(supplyAssetsAggregator),
      ...Object.keys(borrowAssetsAggregator),
      ...Object.keys(collateralAggregator),
    ])

    for (const tokenAddress of allTokenAddresses) {
      const supplyAssets = supplyAssetsAggregator[tokenAddress] || 0n
      const borrowAssets = borrowAssetsAggregator[tokenAddress] || 0n
      const collateral = collateralAggregator[tokenAddress] || 0n

      let totalValueLocked = 0n
      if (positionType === PositionType.Supply) {
        totalValueLocked = supplyAssets + collateral
      } else if (positionType === PositionType.Borrow) {
        totalValueLocked = borrowAssets
      }

      if (totalValueLocked === 0n) {
        continue
      }

      const isCollateralToken = collateralTokensSet.has(tokenAddress)

      let tokenMetadata: Erc20Metadata | undefined

      if (isCollateralToken) {
        tokenMetadata = Object.values(metadata).find(
          ({ collateralToken }) => collateralToken.address === tokenAddress,
        )?.collateralToken
      } else {
        tokenMetadata = Object.values(metadata).find(
          ({ underlyingTokens: [underlyingToken] }) =>
            underlyingToken!.address === tokenAddress,
        )?.underlyingTokens[0]
      }

      if (tokenMetadata) {
        tvlResults.push({
          type: TokenType.Protocol,
          totalSupplyRaw: totalValueLocked,
          ...tokenMetadata,
        })
      }
    }

    return tvlResults
  }

  // Nothing to do here
  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }

  private async getMovements({
    userAddress,

    fromBlock,
    toBlock,
    eventType,
    tokenId,
  }: {
    userAddress: string

    fromBlock: number
    toBlock: number
    eventType:
      | 'supplied'
      | 'collat-supplied'
      | 'withdrawn'
      | 'collat-withdrawn'
      | 'repaid'
      | 'borrowed'
    tokenId: string
  }): Promise<MovementsByBlock[]> {
    const morphoBlue = MorphoBlue__factory.connect(
      morphoBlueContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    const protocolToken = await this._fetchTokenMetadata(tokenId)
    const underlyingToken = await this._fetchLoanTokenMetadata(tokenId)

    let filter: TypedDeferredTopicFilter<
      TypedContractEvent<
        SupplyEvent.InputTuple,
        SupplyEvent.OutputTuple,
        SupplyEvent.OutputObject
      >
    >
    switch (eventType) {
      case 'supplied':
        filter = morphoBlue.filters.Supply(tokenId, undefined, userAddress)
        break
      case 'collat-supplied':
        filter = morphoBlue.filters.SupplyCollateral(
          tokenId,
          undefined,
          userAddress,
        )
        break
      case 'withdrawn':
        filter = morphoBlue.filters.Withdraw(tokenId, undefined, userAddress)
        break
      case 'collat-withdrawn':
        filter = morphoBlue.filters.WithdrawCollateral(
          tokenId,
          undefined,
          userAddress,
        )
        break
      case 'repaid':
        filter = morphoBlue.filters.Repay(tokenId, undefined, userAddress)
        break
      case 'borrowed':
        filter = morphoBlue.filters.Borrow(tokenId, undefined, userAddress)
        break
    }

    const eventResults = await morphoBlue.queryFilter(
      filter,
      fromBlock,
      toBlock,
    )

    const movements = await Promise.all(
      eventResults.map(async (event) => {
        const eventData = event.args

        return {
          protocolToken,
          tokens: [
            {
              ...underlyingToken!,
              balanceRaw: eventData.assets,
              type: TokenType.Underlying,
            },
          ],
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        }
      }),
    )

    return movements
  }
}
