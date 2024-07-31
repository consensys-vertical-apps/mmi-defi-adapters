import { ZeroAddress } from 'ethers'
import { Erc20__factory } from '../../../contracts/factories/Erc20__factory'
import { AdaptersController } from '../../../core/adaptersController'
import { Chain } from '../../../core/constants/chains'
import { IMetadataBuilder } from '../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../core/utils/filters'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { logger } from '../../../core/utils/logger'
import { IProtocolAdapter } from '../../../types/IProtocolAdapter'
import {
  AdapterSettings,
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
} from '../../../types/adapter'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import { Protocol } from '../../protocols'
import { MarketParamsStruct, MarketStruct } from '../contracts/AdaptiveCurveIrm'
import { SupplyEvent } from '../contracts/MorphoBlue'
import {
  TypedContractEvent,
  TypedDeferredTopicFilter,
} from '../contracts/common'
import {
  AdaptiveCurveIrm__factory,
  MorphoBlue__factory,
} from '../contracts/factories'
import { MarketData, MarketParams } from '../internal-utils/Blue'
import { MorphoBlueMath } from '../internal-utils/MorphoBlue.maths'

type MorphoBlueAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata & { tokenId: string }
    underlyingToken: Erc20Metadata
    collateralToken: Erc20Metadata
  }
>

const morphoBlueContractAddresses: Partial<
  Record<Protocol, Partial<Record<Chain, string>>>
> = {
  [Protocol.MorphoBlue]: {
    [Chain.Ethereum]: '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb',
    [Chain.Base]: '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb',
  },
}

export abstract class MorphoBluePoolAdapter
  implements IMetadataBuilder, IProtocolAdapter
{
  protocolId: Protocol
  chainId: Chain

  abstract productId: string
  abstract adapterSettings: AdapterSettings

  protected _provider: CustomJsonRpcProvider

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
  }: ProtocolAdapterParams) {
    this._provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
  }

  __MATH__ = new MorphoBlueMath()

  adaptersController: AdaptersController

  abstract getProtocolDetails(): ProtocolDetails

  async buildMetadata() {
    const morphoBlueContract = MorphoBlue__factory.connect(
      morphoBlueContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    const createMarketFilter = morphoBlueContract.filters.CreateMarket()
    const marketIds = (
      await morphoBlueContract.queryFilter(createMarketFilter, 0, 'latest')
    ).map((event) => event.args.id)

    const metadataObject: MorphoBlueAdapterMetadata = {}

    await Promise.all(
      marketIds.map(async (id) => {
        const marketParams: MarketParams =
          await morphoBlueContract.idToMarketParams(id)
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

        metadataObject[id] = {
          protocolToken: {
            address: marketParams.loanToken,
            tokenId: id,
            name: marketParams.loanToken,
            symbol: loanTokenData.symbol,
            decimals: loanTokenData.decimals,
          },
          underlyingToken: loanTokenData,
          collateralToken: collateralTokenData,
        }
      }),
    )

    return metadataObject
  }

  async getProtocolTokens(): Promise<(Erc20Metadata & { tokenId: string })[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  private async getMarketsId(): Promise<string[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken.tokenId,
    )
  }

  private async _fetchTokenMetadata(tokenId: string): Promise<Erc20Metadata> {
    const tokens = await this.getProtocolTokens()
    const tokenMetadata = tokens.find(
      (token) => token.tokenId.toLowerCase() === tokenId.toLowerCase(),
    )
    if (!tokenMetadata) {
      logger.error({ tokenId }, 'Token metadata not found')
      throw new Error('Token metadata not found')
    }
    return tokenMetadata
  }

  // get the loan token metadata
  private async _fetchLoanTokenMetadata(id: string): Promise<Erc20Metadata> {
    const { underlyingToken } = await this._fetchMarketMetadata(id)

    return underlyingToken
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
    const marketMetadata = (await this.buildMetadata())[lowerCaseId]

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
    const metadata = await this.buildMetadata()
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
      const marketMetadata = metadata[marketId]
      const marketData: MarketData = await morphoBlue.market(marketId, {
        blockTag: blockNumber,
      })

      const loanTokenAddress = marketMetadata?.underlyingToken.address
      if (loanTokenAddress) {
        supplyAssetsAggregator[loanTokenAddress] =
          (supplyAssetsAggregator[loanTokenAddress] || 0n) +
          marketData.totalSupplyAssets

        borrowAssetsAggregator[loanTokenAddress] =
          (borrowAssetsAggregator[loanTokenAddress] || 0n) +
          marketData.totalBorrowAssets
      }

      const collateralTokenAddress = marketMetadata?.collateralToken?.address
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

      const tokenMetadata = Object.values(metadata).find((market) =>
        isCollateralToken
          ? market.collateralToken.address === tokenAddress
          : market.underlyingToken.address === tokenAddress,
      )?.[isCollateralToken ? 'collateralToken' : 'underlyingToken']

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

  // Whitelisted markets thanks to the below graphql extraction:
  // private async graphQlPoolExtraction(chainId: typeof Chain.Ethereum): Promise<
  //   {
  //     marketId: string
  //   }[]
  // > {
  //   const numberOfMarkets = 1000
  //   const minVolumeUSD = 1000000
  //   const graphQueryUrl: Record<
  //     typeof Chain.Ethereum,
  //     {
  //       url: string
  //       query: string
  //     }
  //   > = {
  //     [Chain.Ethereum]: {
  //       url: 'https://api.thegraph.com/subgraphs/name/morpho-association/morpho-blue',
  //       query: `{ markets(first: ${numberOfMarkets} where: {totalValueLockedUSD_gt: ${minVolumeUSD}} orderBy: totalValueLockedUSD orderDirection: desc) {id}}`,
  //     },
  //   }

  //   const { url, query } = graphQueryUrl[chainId]

  //   const response = await fetch(url, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       query,
  //     }),
  //   })

  //   const gqlResponse: {
  //     data: {
  //       markets: [
  //         {
  //           id: string
  //         },
  //       ]
  //     }
  //   } = await response.json()

  //   return gqlResponse.data.markets.map((market) => {
  //     return {
  //       marketId: market.id,
  //     }
  //   })
  // }
}

// NOTE: The APY/APR feature has been removed as of March 2024.
// The below contains logic that may be useful for future features or reference. For more context on this decision, refer to ticket [MMI-4731].

// protected async _getProtocolTokenApr({
//   protocolTokenAddress,
//   blockNumber,
//   aprExpected,
// }: GetAprInputExtended): Promise<number> {
//   const morphoBlue = MorphoBlue__factory.connect(
//     morphoBlueContractAddresses[this.protocolId]![this.chainId]!,
//     this._provider,
//   )

//   const marketId = protocolTokenAddress

//   const [marketData_, marketParams_] = await Promise.all([
//     morphoBlue.market(protocolTokenAddress, {
//       blockTag: blockNumber,
//     }),
//     morphoBlue.idToMarketParams(marketId, {
//       blockTag: blockNumber,
//     }),
//   ])

//   const marketParams: MarketParams = {
//     loanToken: marketParams_.loanToken,
//     collateralToken: marketParams_.collateralToken,
//     oracle: marketParams_.oracle,
//     irm: marketParams_.irm,
//     lltv: marketParams_.lltv,
//   }

//   const marketData: MarketData = {
//     totalSupplyAssets: marketData_.totalSupplyAssets,
//     totalSupplyShares: marketData_.totalSupplyShares,
//     totalBorrowAssets: marketData_.totalBorrowAssets,
//     totalBorrowShares: marketData_.totalBorrowShares,
//     lastUpdate: marketData_.lastUpdate,
//     fee: marketData_.fee,
//   }

//   const irm = AdaptiveCurveIrm__factory.connect(
//     marketParams.irm,
//     this._provider,
//   )

//   const borrowRate =
//     marketParams.irm !== ZeroAddress
//       ? await irm.borrowRateView(marketParams, marketData, {
//           blockTag: blockNumber,
//         })
//       : 0n

//   const positionType = this.getProtocolDetails().positionType

//   if (aprExpected === true) {
//     const borrowAPR = borrowRate * BigInt(SECONDS_PER_YEAR)
//     if (positionType === PositionType.Borrow) {
//       return Number(borrowAPR) / Number(WAD)
//     } else {
//       const utilization = this.__MATH__.wDivUp(
//         marketData.totalBorrowAssets,
//         marketData.totalSupplyAssets,
//       )
//       const supplyAPR = this.__MATH__.wMulDown(
//         this.__MATH__.wMulDown(utilization, borrowAPR),
//         WAD - marketData.fee,
//       )
//       return Number(supplyAPR) / Number(WAD)
//     }
//   }

//   const borrowAPY = this.__MATH__.wTaylorCompounded(
//     borrowRate,
//     BigInt(SECONDS_PER_YEAR),
//   )
//   if (positionType === PositionType.Borrow) {
//     return Number(borrowAPY) / Number(WAD)
//   } else {
//     const utilization = this.__MATH__.wDivUp(
//       marketData.totalBorrowAssets,
//       marketData.totalSupplyAssets,
//     )
//     const supplyAPY = this.__MATH__.wMulDown(
//       this.__MATH__.wMulDown(utilization, borrowAPY),
//       WAD - marketData.fee,
//     )
//     return Number(supplyAPY) / Number(WAD)
//   }
// }

// async getApr({
//   protocolTokenAddress,
//   blockNumber,
// }: GetAprInput): Promise<ProtocolTokenApr> {
//   const apr = await this._getProtocolTokenApr({
//     protocolTokenAddress,
//     blockNumber,
//     aprExpected: true,
//   })
//   return {
//     ...(await this._fetchTokenMetadata(protocolTokenAddress)),
//     aprDecimal: apr * 100,
//   }
// }

// async getApy({
//   protocolTokenAddress,
//   blockNumber,
// }: GetApyInput): Promise<ProtocolTokenApy> {
//   const apy = await this._getProtocolTokenApr({
//     protocolTokenAddress,
//     blockNumber,
//     aprExpected: false,
//   })

//   return {
//     ...(await this._fetchTokenMetadata(protocolTokenAddress)),
//     apyDecimal: apy * 100,
//   }
// }
