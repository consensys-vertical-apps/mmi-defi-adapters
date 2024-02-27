import { ZeroAddress } from 'ethers'
import { WAD } from 'evm-maths/lib/constants'
import { expN } from 'evm-maths/lib/utils'
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
  TokenBalance,
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

  // Whitelisting specific markets is intended
  wstethWethChainlinkAdaptiveCurveIRM945 =
    '0xc54d7acf14de29e0e5527cabd7a576506870346a78a11a6762e2cca66322ec41'
  wstethUsdcChainlinkAdaptiveCurveIRM860 =
    '0xb323495f7e4148be5643a4ea4a8221eef163e4bccfdedc2a6f4696baacbc86cc'
  wbib01UsdcChainlinkAdaptiveCurveIRM965 =
    '0x495130878b7d2f1391e21589a8bcaef22cbc7e1fbbd6866127193b3cc239d8b1'
  marketIds = [
    this.wstethWethChainlinkAdaptiveCurveIRM945,
    this.wstethUsdcChainlinkAdaptiveCurveIRM860,
    this.wbib01UsdcChainlinkAdaptiveCurveIRM965,
  ]

  private _metadataCache: MorphoBlueAdapterMetadata | null = null

  async buildMetadata() {
    if (this._metadataCache) {
      return this._metadataCache
    }

    const morphoBlueContract = MorphoBlue__factory.connect(
      morphoBlueContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    const metadataObject: MorphoBlueAdapterMetadata = {}

    await Promise.all(
      this.marketIds.map(async (id) => {
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

  // this will get ALL the unique protocol tokens
  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    const metadata = await this.buildMetadata()

    const uniqueTokenAddresses = new Set<string>()
    Object.values(metadata).forEach((market) => {
      uniqueTokenAddresses.add(market.underlyingToken.address)
      if (market.collateralToken) {
        uniqueTokenAddresses.add(market.collateralToken.address)
      }
    })

    const tokens: Erc20Metadata[] = []
    for (const address of uniqueTokenAddresses) {
      const tokenData = await getTokenMetadata(
        address,
        this.chainId,
        this._provider,
      )
      tokens.push(tokenData)
    }

    return tokens
  }

  protected async _fetchTokenMetadata(
    tokenAddress: string,
  ): Promise<Erc20Metadata> {
    const tokens = await this.getProtocolTokens()
    const tokenMetadata = tokens.find((token) => token.address === tokenAddress)
    if (!tokenMetadata) {
      logger.error({ tokenAddress }, 'Token metadata not found')
      throw new Error('Token metadata not found')
    }
    return tokenMetadata
  }

  // let's get the loan token metadata
  protected async _fetchLoanTokenMetadata(id: string): Promise<Erc20Metadata> {
    const { underlyingToken } = await this._fetchMarketMetadata(id)

    return underlyingToken
  }

  // let's get the collateral token metadata
  protected async _fetchCollateralTokenMetadata(
    id: string,
  ): Promise<Erc20Metadata> {
    const { collateralToken } = await this._fetchMarketMetadata(id)
    return collateralToken || null
  }

  // let's get the market token metadata
  private async _fetchMarketMetadata(id: string) {
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
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const tokenMetadata = await this._fetchTokenMetadata(
      protocolTokenBalance.address,
    )

    const underlyingTokenBalance = {
      ...tokenMetadata,
      balanceRaw: protocolTokenBalance.balanceRaw,
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
    ): Promise<bigint> => {
      let balanceRaw = 0n
      if (positionType === PositionType.Supply) {
        const userBalance: PositionUser = await morphoBlue.position(
          marketId,
          userAddress,
          {
            blockTag: blockNumber,
          },
        )
        const supplyShares = userBalance.supplyShares

        const [marketData, marketParams] = await Promise.all([
          morphoBlue.market(marketId, {
            blockTag: blockNumber,
          }),
          morphoBlue.idToMarketParams(marketId, {
            blockTag: blockNumber,
          }),
        ])

        const irm = AdaptiveCurveIrm__factory.connect(
          marketParams.irm,
          this._provider,
        )
        const borrowRate =
          marketParams.irm !== ZeroAddress
            ? await irm.borrowRateView(marketParams, marketData)
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
        balanceRaw = supplyAssets || 0n
      } else {
        // corresponds to the borrow position: careful: collateral AND borrow has to be taken into account
        const userBalance: PositionUser = await morphoBlue.position(
          marketId,
          userAddress,
          {
            blockTag: blockNumber,
          },
        )
        const borrowShares = userBalance.borrowShares

        const [marketData, marketParams] = await Promise.all([
          morphoBlue.market(marketId, {
            blockTag: blockNumber,
          }),
          morphoBlue.idToMarketParams(marketId, {
            blockTag: blockNumber,
          }),
        ])

        const irm = AdaptiveCurveIrm__factory.connect(
          marketParams.irm,
          this._provider,
        )
        const borrowRate =
          marketParams.irm !== ZeroAddress
            ? await irm.borrowRateView(marketParams, marketData)
            : 0n

        const block = await this._provider.getBlock('latest')

        const updatedMarketData = this.__MATH__.accrueInterests(
          BigInt(block!.timestamp),
          marketData,
          borrowRate,
        )

        const borrowAssets = this.__MATH__.toAssetsDown(
          borrowShares,
          updatedMarketData.totalSupplyAssets,
          updatedMarketData.totalSupplyShares,
        )
        balanceRaw = borrowAssets || 0n
      }
      return balanceRaw
    }

    const protocolTokensBalances = await Promise.all(
      this.marketIds.map(async (id) => {
        if (positionType === PositionType.Supply) {
          const loanMetadata = await this._fetchLoanTokenMetadata(id)
          const amount = await getBalance(id, userAddress, blockNumber!)
          return {
            address: loanMetadata.address,
            balance: amount,
          }
        } else {
          const loanMetadata = await this._fetchLoanTokenMetadata(id)
          const amount = await getBalance(id, userAddress, blockNumber!)
          return {
            address: loanMetadata.address,
            balance: amount,
          }
          return {
            address: ZeroAddress,
            balance: 0n,
          }
        }
      }),
    )

    const protocolTokens: ProtocolPosition[] = await Promise.all(
      protocolTokensBalances
        .filter((protocolTokenBalance) => protocolTokenBalance.balance !== 0n) // Filter out balances equal to 0
        .map(async (protocolTokenBalance) => {
          const tokenMetadata = await this._fetchTokenMetadata(
            protocolTokenBalance.address,
          )

          const completeTokenBalance: TokenBalance = {
            address: protocolTokenBalance.address,
            balanceRaw: protocolTokenBalance.balance,
            name: tokenMetadata.name,
            symbol: tokenMetadata.symbol,
            decimals: tokenMetadata.decimals,
          }

          const underlyingTokenBalances =
            await this._getUnderlyingTokenBalances({
              userAddress,
              protocolTokenBalance: completeTokenBalance,
              blockNumber,
            })

          return {
            ...protocolTokenBalance,
            balanceRaw: protocolTokenBalance.balance,
            name: tokenMetadata.name,
            symbol: tokenMetadata.symbol,
            decimals: tokenMetadata.decimals,
            type: TokenType.Protocol,
            tokens: underlyingTokenBalances,
          }
        }),
    )
    return protocolTokens
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

  // TODO: verify thanks to the tests
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

    for (const marketId of this.marketIds) {
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

      // Track the collateral token
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
        continue // Skip to the next iteration
      }

      // Check if the token is a collateral token
      const isCollateralToken = collateralTokensSet.has(tokenAddress)

      // Find the token metadata using the tokenAddress
      const tokenMetadata = Object.values(metadata).find((market) =>
        isCollateralToken
          ? market.collateralToken.address === tokenAddress
          : market.underlyingToken.address === tokenAddress,
      )?.[isCollateralToken ? 'collateralToken' : 'underlyingToken'] // Fetch the appropriate metadata based on the token type

      // Construct TVL result for the token
      if (tokenMetadata) {
        tvlResults.push({
          type: TokenType.Protocol,
          totalSupplyRaw: totalValueLocked,
          ...tokenMetadata, // This will now correctly include either loanToken or collateralToken metadata
          // 'tokens' field can be added here if applicable
        })
      }
    }

    return tvlResults
  }

  // Nothing to do as there is no protocol tokens
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

  // TODO: verify thanks to the tests
  protected async _getProtocolTokenApr({
    protocolTokenAddress,
    blockNumber,
  }: GetAprInput): Promise<number> {
    const morphoBlue = MorphoBlue__factory.connect(
      morphoBlueContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    const marketId = protocolTokenAddress
    const [marketData, marketParams] = await Promise.all([
      morphoBlue.market(protocolTokenAddress, {
        blockTag: blockNumber,
      }),
      morphoBlue.idToMarketParams(marketId, {
        blockTag: blockNumber,
      }),
    ])

    const irm = AdaptiveCurveIrm__factory.connect(
      marketParams.irm,
      this._provider,
    )
    const borrowRate =
      marketParams.irm !== ZeroAddress
        ? await irm.borrowRateView(marketParams, marketData)
        : 0n

    const positionType = this.getProtocolDetails().positionType

    if (positionType === PositionType.Borrow) {
      return Number(
        expN(borrowRate * BigInt(SECONDS_PER_YEAR), BigInt(3), WAD) - 1n,
      )
    } else {
      const utilization =
        marketData.totalBorrowAssets / marketData.totalSupplyAssets
      const supplyRate = utilization * borrowRate * (1n - marketData.fee)
      return Number(
        expN(supplyRate * BigInt(SECONDS_PER_YEAR), BigInt(3), WAD) - 1n,
      )
    }
  }

  // TODO: verify thanks to the tests
  async getApr({
    protocolTokenAddress,
    blockNumber,
  }: GetAprInput): Promise<ProtocolTokenApr> {
    const apr = await this._getProtocolTokenApr({
      protocolTokenAddress,
      blockNumber,
    })
    return {
      ...(await this._fetchTokenMetadata(protocolTokenAddress)),
      aprDecimal: apr * 100,
    }
  }

  // TODO: verify thanks to the tests
  async getApy({
    protocolTokenAddress,
    blockNumber,
  }: GetApyInput): Promise<ProtocolTokenApy> {
    const apy = await this._getProtocolTokenApr({
      protocolTokenAddress,
      blockNumber,
    })

    return {
      ...(await this._fetchTokenMetadata(protocolTokenAddress)),
      apyDecimal: apy * 100,
    }
  }
}
