import { ZeroAddress } from 'ethers'
import { WAD } from 'evm-maths/lib/constants'
import { Erc20__factory } from '../../../contracts/factories/Erc20__factory'
import { AdaptersController } from '../../../core/adaptersController'
import { Chain } from '../../../core/constants/chains'
import { SECONDS_PER_YEAR } from '../../../core/constants/SECONDS_PER_YEAR'
import { IMetadataBuilder } from '../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { logger } from '../../../core/utils/logger'
import {
  GetPositionsInput,
  GetEventsInput,
  GetApyInput,
  GetAprInput,
  GetTotalValueLockedInput,
  GetConversionRateInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenUnderlyingRate,
  ProtocolTokenTvl,
  ProtocolPosition,
  TokenType,
  Underlying,
} from '../../../types/adapter'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import { Protocol } from '../../protocols'
import {
  AdaptiveCurveIrm__factory,
  MorphoBlue__factory,
} from '../contracts/factories'
import { MarketParams, MarketData, PositionUser } from '../internal-utils/Blue'
import { MorphoBlueMath } from '../internal-utils/MorphoBlue.maths'

type MorphoBlueAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
    collateralToken: Erc20Metadata
  }
>
type GetAprInputExtended = GetAprInput & {
  aprExpected?: boolean // Making it optional
}

type ProtocolTokenBalance = {
  address: string
  balance: bigint
  id: string
  tokens?: {
    address: string
    balance: number
    balanceRaw: bigint
    name: string
    symbol: string
    decimals: number
    side?: string
  }[]
}

const morphoBlueContractAddresses: Partial<
  Record<Protocol, Partial<Record<Chain, string>>>
> = {
  [Protocol.MorphoBlue]: {
    [Chain.Ethereum]: '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb',
  },
}

export abstract class MorphoBluePoolAdapter implements IMetadataBuilder {
  protocolId: Protocol
  chainId: Chain

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

  private _metadataCache: MorphoBlueAdapterMetadata | null = null

  async buildMetadata() {
    if (this._metadataCache) {
      return this._metadataCache
    }

    const marketIdObjects = await this.graphQlPoolExtraction(Chain.Ethereum)
    const marketIds = marketIdObjects.map((obj) => obj.marketId)
    const morphoBlueContract = MorphoBlue__factory.connect(
      morphoBlueContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

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
            address: id,
            name: marketParams.loanToken,
            symbol: loanTokenData.symbol,
            decimals: loanTokenData.decimals,
          },
          underlyingToken: {
            address: marketParams.loanToken,
            name: marketParams.loanToken,
            symbol: loanTokenData.symbol,
            decimals: loanTokenData.decimals,
          },
          collateralToken: {
            address: marketParams.collateralToken,
            name: marketParams.collateralToken,
            symbol: collateralTokenData.symbol,
            decimals: collateralTokenData.decimals,
          },
        }
      }),
    )

    this._metadataCache = metadataObject
    return metadataObject
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  async getMarketsId(): Promise<string[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken.address,
    )
  }

  protected async _fetchTokenMetadata(
    tokenAddress: string,
  ): Promise<Erc20Metadata> {
    const tokens = await this.getProtocolTokens()
    const tokenMetadata = tokens.find(
      (token) => token.address.toLowerCase() === tokenAddress.toLowerCase(),
    )
    if (!tokenMetadata) {
      logger.error({ tokenAddress }, 'Token metadata not found')
      throw new Error('Token metadata not found')
    }
    return tokenMetadata
  }

  // get the loan token metadata
  protected async _fetchLoanTokenMetadata(id: string): Promise<Erc20Metadata> {
    const { underlyingToken } = await this._fetchMarketMetadata(id)

    return underlyingToken
  }

  // get the collateral token metadata
  protected async _fetchCollateralTokenMetadata(
    id: string,
  ): Promise<Erc20Metadata> {
    const { collateralToken } = await this._fetchMarketMetadata(id)
    return collateralToken
  }

  // get the market token metadata
  private async _fetchMarketMetadata(id: string) {
    id = id.toLowerCase()
    const marketMetadata = (await this.buildMetadata())[id]

    if (!marketMetadata) {
      logger.error({ id }, 'id market not found')
      throw new Error('id market not found')
    }

    return marketMetadata
  }

  protected async _fetchUnderlyingTokensMetadata(
    tokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const metadata = await this.buildMetadata()

    // Find the market metadata using the token address, could be loanToken or collateralToken
    const marketMetadata = Object.values(metadata).find(
      (market) =>
        market.underlyingToken.address === tokenAddress ||
        market.collateralToken.address === tokenAddress,
    )

    if (!marketMetadata) {
      logger.error({ tokenAddress }, 'Token metadata not found in any market')
      throw new Error('Token metadata not found in any market')
    }

    // Return an array of metadata, one for the loanToken and one for the collateralToken if it exists
    const tokensMetadata: Erc20Metadata[] = [marketMetadata.underlyingToken]
    if (marketMetadata.collateralToken) {
      tokensMetadata.push(marketMetadata.collateralToken)
    }
    return tokensMetadata
  }

  protected async _getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: ProtocolTokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const tokenMetadata = await this._fetchTokenMetadata(
      protocolTokenBalance.id,
    )

    const underlyingTokenBalance = {
      ...tokenMetadata,
      balanceRaw: protocolTokenBalance.balance,
      type: TokenType.Underlying,
    }
    return [underlyingTokenBalance]
  }

  // check that the supply could not be equal to zero
  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const morphoBlue = MorphoBlue__factory.connect(
      morphoBlueContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    const positionType = this.getProtocolDetails().positionType

    const getBalance = async (
      marketId: string,
      userAddress: string,
      blockNumber: number,
    ): Promise<{
      supplyAmount: bigint
      borrowAmount: bigint
      collateralAmount: bigint
    }> => {
      let supplyAmount = 0n
      let collateralAmount = 0n
      let borrowAmount = 0n

      const userBalance: PositionUser = await morphoBlue.position(
        marketId,
        userAddress,
        {
          blockTag: blockNumber,
        },
      )
      const supplyShares = userBalance.supplyShares
      const borrowShares = userBalance.borrowShares
      const [marketData_, marketParams_] = await Promise.all([
        morphoBlue.market(marketId, {
          blockTag: blockNumber,
        }),
        morphoBlue.idToMarketParams(marketId, {
          blockTag: blockNumber,
        }),
      ])

      const marketParams: MarketParams = {
        loanToken: marketParams_.loanToken,
        collateralToken: marketParams_.collateralToken,
        oracle: marketParams_.oracle,
        irm: marketParams_.irm,
        lltv: marketParams_.lltv,
      }

      const marketData: MarketData = {
        totalSupplyAssets: marketData_.totalSupplyAssets,
        totalSupplyShares: marketData_.totalSupplyShares,
        totalBorrowAssets: marketData_.totalBorrowAssets,
        totalBorrowShares: marketData_.totalBorrowShares,
        lastUpdate: marketData_.lastUpdate,
        fee: marketData_.fee,
      }

      const irm = AdaptiveCurveIrm__factory.connect(
        marketParams.irm,
        this._provider,
      )
      const borrowRate =
        marketParams.irm !== ZeroAddress
          ? await irm.borrowRateView(marketParams, marketData, {
              blockTag: blockNumber,
            })
          : 0n

      const block = await this._provider.getBlock('latest')

      const updatedMarketData = this.__MATH__.accrueInterests(
        BigInt(block!.timestamp),
        marketData,
        borrowRate,
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
      supplyAmount = supplyAssets || 0n
      collateralAmount = userBalance.collateral
      borrowAmount = borrowAssets || 0n
      return { supplyAmount, borrowAmount, collateralAmount }
    }

    const resolvedBlockNumber =
      blockNumber ?? (await this._provider.getBlockNumber())
    const marketsIds = await this.getMarketsId()
    const resolvedProtocolPositions = await Promise.all(
      marketsIds.map(async (marketId): Promise<ProtocolPosition | null> => {
        const { supplyAmount, borrowAmount, collateralAmount } =
          await getBalance(marketId, userAddress, resolvedBlockNumber)

        // Decide which amount to consider based on the positionType
        const amount =
          positionType === PositionType.Supply ? supplyAmount : borrowAmount

        // Skip markets with a balance of 0
        if (amount === 0n) {
          return null
        }

        const loanMetadata = await this._fetchLoanTokenMetadata(marketId)

        const tokens: Underlying[] = []
        if (positionType === PositionType.Borrow && collateralAmount > 0n) {
          const collateralMetadata = await this._fetchCollateralTokenMetadata(
            marketId,
          )
          tokens.push({
            address: marketId,
            balanceRaw: collateralAmount,
            name: collateralMetadata.name,
            symbol: collateralMetadata.symbol,
            decimals: collateralMetadata.decimals,
            type: 'underlying',
          })
          tokens.push({
            address: marketId,
            balanceRaw: borrowAmount,
            name: loanMetadata.name,
            symbol: loanMetadata.symbol,
            decimals: loanMetadata.decimals,
            type: 'underlying',
          })
        }

        const protocolPosition: ProtocolPosition = {
          address: marketId,
          name: loanMetadata.name,
          symbol: loanMetadata.symbol,
          decimals: loanMetadata.decimals,
          balanceRaw: amount,
          type: TokenType.Protocol,
          tokens: tokens.length > 0 ? tokens : undefined,
        }

        return protocolPosition
      }),
    )

    const validPositions: ProtocolPosition[] = resolvedProtocolPositions.filter(
      (position): position is ProtocolPosition => position !== null,
    )

    return validPositions
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.getMovements({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'withdrawn',
    })
  }

  async getCollateralWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.getMovements({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'collat-withdrawn',
    })
  }

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.getMovements({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'supplied',
    })
  }

  async getCollateralDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.getMovements({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'collat-supplied',
    })
  }

  async getBorrows({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.getMovements({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'borrowed',
    })
  }

  async getRepays({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return this.getMovements({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
      eventType: 'repaid',
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
  async getProtocolTokenToUnderlyingTokenRate(
    _input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate> {
    throw new NotImplementedError()
  }

  private async getMovements({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
    eventType,
  }: {
    userAddress: string
    protocolTokenAddress: string
    fromBlock: number
    toBlock: number
    eventType:
      | 'supplied'
      | 'collat-supplied'
      | 'withdrawn'
      | 'collat-withdrawn'
      | 'repaid'
      | 'borrowed'
  }): Promise<MovementsByBlock[]> {
    const morphoBlue = MorphoBlue__factory.connect(
      morphoBlueContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    const protocolToken = await this._fetchTokenMetadata(protocolTokenAddress)
    const underlyingToken = await this._fetchLoanTokenMetadata(
      protocolTokenAddress,
    )

    let filter
    switch (eventType) {
      case 'supplied':
        filter = morphoBlue.filters.Supply(undefined, undefined, userAddress)
        break
      case 'collat-supplied':
        filter = morphoBlue.filters.SupplyCollateral(
          undefined,
          undefined,
          userAddress,
        )
        break
      case 'withdrawn':
        filter = morphoBlue.filters.Withdraw(undefined, undefined, userAddress)
        break
      case 'collat-withdrawn':
        filter = morphoBlue.filters.WithdrawCollateral(undefined, userAddress)
        break
      case 'repaid':
        filter = morphoBlue.filters.Repay(undefined, undefined, userAddress)
        break
      case 'borrowed':
        filter = morphoBlue.filters.Borrow(undefined, undefined, userAddress)
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

  protected async _getProtocolTokenApr({
    protocolTokenAddress,
    blockNumber,
    aprExpected,
  }: GetAprInputExtended): Promise<number> {
    const morphoBlue = MorphoBlue__factory.connect(
      morphoBlueContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    const marketId = protocolTokenAddress

    const [marketData_, marketParams_] = await Promise.all([
      morphoBlue.market(protocolTokenAddress, {
        blockTag: blockNumber,
      }),
      morphoBlue.idToMarketParams(marketId, {
        blockTag: blockNumber,
      }),
    ])

    const marketParams: MarketParams = {
      loanToken: marketParams_.loanToken,
      collateralToken: marketParams_.collateralToken,
      oracle: marketParams_.oracle,
      irm: marketParams_.irm,
      lltv: marketParams_.lltv,
    }

    const marketData: MarketData = {
      totalSupplyAssets: marketData_.totalSupplyAssets,
      totalSupplyShares: marketData_.totalSupplyShares,
      totalBorrowAssets: marketData_.totalBorrowAssets,
      totalBorrowShares: marketData_.totalBorrowShares,
      lastUpdate: marketData_.lastUpdate,
      fee: marketData_.fee,
    }

    const irm = AdaptiveCurveIrm__factory.connect(
      marketParams.irm,
      this._provider,
    )

    const borrowRate =
      marketParams.irm !== ZeroAddress
        ? await irm.borrowRateView(marketParams, marketData, {
            blockTag: blockNumber,
          })
        : 0n

    const positionType = this.getProtocolDetails().positionType

    if (aprExpected === true) {
      const borrowAPR = borrowRate * BigInt(SECONDS_PER_YEAR)
      if (positionType === PositionType.Borrow) {
        return Number(borrowAPR) / Number(WAD)
      } else {
        const utilization = this.__MATH__.wDivUp(
          marketData.totalBorrowAssets,
          marketData.totalSupplyAssets,
        )
        const supplyAPR = this.__MATH__.wMulDown(
          this.__MATH__.wMulDown(utilization, borrowAPR),
          WAD - marketData.fee,
        )
        return Number(supplyAPR) / Number(WAD)
      }
    }

    const borrowAPY = this.__MATH__.wTaylorCompounded(
      borrowRate,
      BigInt(SECONDS_PER_YEAR),
    )
    if (positionType === PositionType.Borrow) {
      return Number(borrowAPY) / Number(WAD)
    } else {
      const utilization = this.__MATH__.wDivUp(
        marketData.totalBorrowAssets,
        marketData.totalSupplyAssets,
      )
      const supplyAPY = this.__MATH__.wMulDown(
        this.__MATH__.wMulDown(utilization, borrowAPY),
        WAD - marketData.fee,
      )
      return Number(supplyAPY) / Number(WAD)
    }
  }

  async getApr({
    protocolTokenAddress,
    blockNumber,
  }: GetAprInput): Promise<ProtocolTokenApr> {
    const apr = await this._getProtocolTokenApr({
      protocolTokenAddress,
      blockNumber,
      aprExpected: true,
    })
    return {
      ...(await this._fetchTokenMetadata(protocolTokenAddress)),
      aprDecimal: apr * 100,
    }
  }

  async getApy({
    protocolTokenAddress,
    blockNumber,
  }: GetApyInput): Promise<ProtocolTokenApy> {
    const apy = await this._getProtocolTokenApr({
      protocolTokenAddress,
      blockNumber,
      aprExpected: false,
    })

    return {
      ...(await this._fetchTokenMetadata(protocolTokenAddress)),
      apyDecimal: apy * 100,
    }
  }

  // Whitelisted markets thanks to the below graphql extraction:
  private async graphQlPoolExtraction(chainId: typeof Chain.Ethereum): Promise<
    {
      marketId: string
    }[]
  > {
    const numberOfMarkets = 1000
    const minVolumeUSD = 1000000
    const graphQueryUrl: Record<
      typeof Chain.Ethereum,
      {
        url: string
        query: string
      }
    > = {
      [Chain.Ethereum]: {
        url: 'https://api.thegraph.com/subgraphs/name/morpho-association/morpho-blue',
        query: `{ markets(first: ${numberOfMarkets} where: {totalValueLockedUSD_gt: ${minVolumeUSD}} orderBy: totalValueLockedUSD orderDirection: desc) {id}}`,
      },
    }

    const { url, query } = graphQueryUrl[chainId]

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
      }),
    })

    const gqlResponse: {
      data: {
        markets: [
          {
            id: string
          },
        ]
      }
    } = await response.json()

    return gqlResponse.data.markets.map((market) => {
      return {
        marketId: market.id,
      }
    })
  }
}
