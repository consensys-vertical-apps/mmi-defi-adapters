import { formatUnits } from 'ethers'
import { AdaptersController } from '../../../core/adaptersController'
import { Chain } from '../../../core/constants/chains'
import { RAY } from '../../../core/constants/RAY'
import { SECONDS_PER_YEAR } from '../../../core/constants/SECONDS_PER_YEAR'
import { ZERO_ADDRESS } from '../../../core/constants/ZERO_ADDRESS'
import { IMetadataBuilder } from '../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../core/errors/errors'
import { aggregateTrades } from '../../../core/utils/aggregateTrades'
import { aprToApy } from '../../../core/utils/aprToApy'
import { CustomJsonRpcProvider } from '../../../core/utils/customJsonRpcProvider'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { logger } from '../../../core/utils/logger'
import { formatProtocolTokenArrayToMap } from '../../../core/utils/protocolTokenToMap'
import {
  GetPositionsInput,
  GetEventsInput,
  GetApyInput,
  GetAprInput,
  GetTotalValueLockedInput,
  GetProfitsInput,
  GetConversionRateInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenUnderlyingRate,
  ProfitsWithRange,
  ProtocolTokenTvl,
  ProtocolPosition,
  TokenBalance,
  TokenType,
  Underlying,
  UnderlyingTokenRate,
  BaseTokenMovement,
} from '../../../types/adapter'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import { Protocol } from '../../protocols'
import {
  MorphoAaveV2__factory,
  AToken__factory,
  MorphoAaveV2Lens__factory,
} from '../contracts'
import {
  SuppliedEvent,
  WithdrawnEvent,
  BorrowedEvent,
  RepaidEvent,
} from '../contracts/MorphoAaveV2'

type MorphoAaveV2PeerToPoolAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
  }
>

const morphoAaveV2ContractAddresses: Partial<
  Record<Protocol, Partial<Record<Chain, string>>>
> = {
  [Protocol.MorphoAaveV2]: {
    [Chain.Ethereum]: '0x777777c9898d384f785ee44acfe945efdff5f3e0',
  },
}

export abstract class MorphoBasePoolAdapter implements IMetadataBuilder {
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

  lensAddress = '0x507fa343d0a90786d86c7cd885f5c49263a91ff4'

  adaptersController: AdaptersController

  abstract getProtocolDetails(): ProtocolDetails

  private _metadataCache: MorphoAaveV2PeerToPoolAdapterMetadata | null = null

  async buildMetadata() {
    if (this._metadataCache) {
      return this._metadataCache
    }

    const morphoAaveV2Contract = MorphoAaveV2__factory.connect(
      morphoAaveV2ContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    const metadataObject: MorphoAaveV2PeerToPoolAdapterMetadata = {}

    const markets = await morphoAaveV2Contract.getMarketsCreated()

    await Promise.all(
      markets.map(async (marketAddress) => {
        const aTokenContract = AToken__factory.connect(
          marketAddress,
          this._provider,
        )

        const supplyTokenAddress = await aTokenContract
          .UNDERLYING_ASSET_ADDRESS()
          .catch((err) => {
            if (err) return ZERO_ADDRESS
            throw err
          })

        // Await the promises directly within Promise.all
        const [protocolToken, underlyingToken] = await Promise.all([
          getTokenMetadata(marketAddress, this.chainId, this._provider),
          getTokenMetadata(supplyTokenAddress, this.chainId, this._provider),
        ])

        metadataObject[protocolToken.address] = {
          protocolToken,
          underlyingToken,
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

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenBalance.address,
    )

    const underlyingTokenBalance = {
      ...underlyingToken,
      balanceRaw: protocolTokenBalance.balanceRaw,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    return [underlyingToken]
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const lensContract = MorphoAaveV2Lens__factory.connect(
      this.lensAddress,
      this._provider,
    )
    const tokens = await this.getProtocolTokens()
    const positionType = this.getProtocolDetails().positionType

    const getBalance = async (
      market: Erc20Metadata,
      userAddress: string,
      blockNumber: number,
    ): Promise<bigint> => {
      let balanceRaw
      if (positionType === PositionType.Supply) {
        ;[, , balanceRaw] = await lensContract.getCurrentSupplyBalanceInOf(
          market.address,
          userAddress,
          { blockTag: blockNumber },
        )
      } else {
        ;[, , balanceRaw] = await lensContract.getCurrentBorrowBalanceInOf(
          market.address,
          userAddress,
          { blockTag: blockNumber },
        )
      }
      return balanceRaw
    }

    const protocolTokensBalances = await Promise.all(
      tokens.map(async (market) => {
        const amount = await getBalance(market, userAddress, blockNumber!)
        return {
          address: market.address,
          balance: Number(amount),
        }
      }),
    )

    const protocolTokens: ProtocolPosition[] = await Promise.all(
      protocolTokensBalances
        .filter((protocolTokenBalance) => protocolTokenBalance.balance !== 0) // Filter out balances equal to 0
        .map(async (protocolTokenBalance) => {
          const balanceRaw = BigInt(protocolTokenBalance.balance)

          const tokenMetadata = await this.fetchProtocolTokenMetadata(
            protocolTokenBalance.address,
          )

          const completeTokenBalance: TokenBalance = {
            address: protocolTokenBalance.address,
            balanceRaw,
            name: tokenMetadata.name,
            symbol: tokenMetadata.symbol,
            decimals: tokenMetadata.decimals,
          }

          const underlyingTokenBalances = await this.getUnderlyingTokenBalances(
            {
              userAddress,
              protocolTokenBalance: completeTokenBalance,
              blockNumber,
            },
          )

          return {
            ...protocolTokenBalance,
            balanceRaw,
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

  async getProfits({
    userAddress,
    fromBlock,
    toBlock,
  }: GetProfitsInput): Promise<ProfitsWithRange> {
    // Fetch end and start position values
    const [endPositionValues, startPositionValues] = await Promise.all([
      this.getPositions({
        userAddress,
        blockNumber: toBlock,
      }).then(formatProtocolTokenArrayToMap),
      this.getPositions({
        userAddress,
        blockNumber: fromBlock,
      }).then(formatProtocolTokenArrayToMap),
    ])

    // Fetch and process each token's movements
    const tokens = await Promise.all(
      Object.values(endPositionValues).map(
        async ({
          protocolTokenMetadata,
          underlyingTokenPositions: underlyingEndPositions,
        }) => {
          const getEventsInput: GetEventsInput = {
            userAddress,
            protocolTokenAddress: protocolTokenMetadata.address,
            fromBlock,
            toBlock,
          }

          // Fetch withdrawals and deposits
          const [withdrawals, deposits /*, repays, borrows*/] =
            await Promise.all([
              this.getWithdrawals(getEventsInput).then(aggregateTrades),
              this.getDeposits(getEventsInput).then(aggregateTrades),
              // this.getRepays(getEventsInput).then(aggregateTrades), // depends on what we want to do
              // this.getBorrows(getEventsInput).then(aggregateTrades),
            ])

          // Calculate profit for each token
          return {
            ...protocolTokenMetadata,
            type: TokenType.Protocol,
            tokens: Object.values(underlyingEndPositions).map(
              ({
                address,
                name,
                symbol,
                decimals,
                balanceRaw: endPositionValueRaw,
              }) => {
                const startPositionValueRaw =
                  startPositionValues[protocolTokenMetadata.address]
                    ?.underlyingTokenPositions[address]?.balanceRaw ?? 0n

                const calculationData = {
                  withdrawalsRaw: withdrawals[address] ?? 0n,
                  depositsRaw: deposits[address] ?? 0n,
                  // repaysRaw: repays[address] ?? 0n,
                  // borrowsRaw: borrows[address] ?? 0n,
                  endPositionValueRaw: endPositionValueRaw ?? 0n,
                  startPositionValueRaw,
                }

                let profitRaw =
                  calculationData.endPositionValueRaw +
                  calculationData.withdrawalsRaw -
                  calculationData.depositsRaw -
                  calculationData.startPositionValueRaw

                if (
                  this.getProtocolDetails().positionType === PositionType.Borrow
                ) {
                  profitRaw *= -1n
                }

                return {
                  address,
                  name,
                  symbol,
                  decimals,
                  profitRaw,
                  type: TokenType.Underlying,
                  calculationData: {
                    withdrawalsRaw: withdrawals[address] ?? 0n,
                    withdrawals: formatUnits(
                      withdrawals[address] ?? 0n,
                      decimals,
                    ),
                    depositsRaw: deposits[address] ?? 0n,
                    deposits: formatUnits(deposits[address] ?? 0n, decimals),
                    startPositionValueRaw: startPositionValueRaw ?? 0n,
                    startPositionValue: formatUnits(
                      startPositionValueRaw ?? 0n,
                      decimals,
                    ),
                    endPositionValueRaw,
                    endPositionValue: formatUnits(
                      endPositionValueRaw ?? 0n,
                      decimals,
                    ),
                  },
                }
              },
            ),
          }
        },
      ),
    )

    return { tokens, fromBlock, toBlock }
  }

  async getTotalValueLocked({
    blockNumber,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const tokens = await this.getProtocolTokens()
    const lensContract = MorphoAaveV2Lens__factory.connect(
      this.lensAddress,
      this._provider,
    )
    const positionType = this.getProtocolDetails().positionType
    return Promise.all(
      tokens.map(async (tokenMetadata) => {
        let totalValueRaw

        if (positionType === PositionType.Supply) {
          const [poolSupply, p2pSupply] =
            await lensContract.getTotalMarketSupply(tokenMetadata.address, {
              blockTag: blockNumber,
            })
          totalValueRaw = poolSupply + p2pSupply
        } else {
          // Assuming LensType.Borrow or other types
          const [poolBorrow, p2pBorrow] =
            await lensContract.getTotalMarketBorrow(tokenMetadata.address, {
              blockTag: blockNumber,
            })
          totalValueRaw = poolBorrow + p2pBorrow
        }

        return {
          ...tokenMetadata,
          type: TokenType.Protocol,
          totalSupplyRaw: totalValueRaw !== undefined ? totalValueRaw : 0n,
        }
      }),
    )
  }

  protected async getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenMetadata.address,
    )

    // 'balanceOf' of 'aTokens' is already scaled with the exchange rate
    const PRICE_PEGGED_TO_ONE = 1
    const pricePerShareRaw = BigInt(
      PRICE_PEGGED_TO_ONE * 10 ** protocolTokenMetadata.decimals,
    )

    return [
      {
        ...underlyingToken,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }

  async getProtocolTokenToUnderlyingTokenRate(
    _input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate> {
    throw new NotImplementedError()
  }

  protected extractEventData(
    event: any,
    eventType: string,
  ):
    | SuppliedEvent.OutputObject
    | WithdrawnEvent.OutputObject
    | RepaidEvent.OutputObject
    | BorrowedEvent.OutputObject
    | undefined {
    switch (eventType) {
      case 'supplied':
        return event.args as SuppliedEvent.OutputObject
      case 'withdrawn':
        return event.args as WithdrawnEvent.OutputObject
      case 'repaid':
        return event.args as RepaidEvent.OutputObject
      case 'borrowed':
        return event.args as BorrowedEvent.OutputObject
    }
  }

  async getMovements({
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
    eventType: 'supplied' | 'withdrawn' | 'repaid' | 'borrowed'
  }): Promise<MovementsByBlock[]> {
    const morphoAaveV2Contract = MorphoAaveV2__factory.connect(
      protocolTokenAddress,
      this._provider,
    )

    let filter
    switch (eventType) {
      case 'supplied':
        filter = morphoAaveV2Contract.filters.Supplied(undefined, userAddress)
        break
      case 'withdrawn':
        filter = morphoAaveV2Contract.filters.Withdrawn(userAddress)
        break
      case 'repaid':
        filter = morphoAaveV2Contract.filters.Repaid(undefined, userAddress)
        break
      case 'borrowed':
        filter = morphoAaveV2Contract.filters.Borrowed(userAddress)
        break
    }

    const eventResults = await morphoAaveV2Contract.queryFilter(
      filter,
      fromBlock,
      toBlock,
    )

    const movements = await Promise.all(
      eventResults.map(async (event) => {
        const eventData = this.extractEventData(event, eventType)
        if (!eventData) {
          return null
        }

        const protocolToken = await this.fetchProtocolTokenMetadata(
          eventData._poolToken,
        )
        const underlyingTokens = await this.fetchUnderlyingTokensMetadata(
          eventData._poolToken,
        )

        const underlyingTokensMovement: Record<string, BaseTokenMovement> = {}
        underlyingTokens.forEach((underlyingToken) => {
          underlyingTokensMovement[underlyingToken.address] = {
            ...underlyingToken,
            transactionHash: event.transactionHash,
            movementValueRaw: eventData._amount,
          }
        })

        return {
          protocolToken: {
            ...protocolToken,
          },
          underlyingTokensMovement,
          blockNumber: event.blockNumber,
        }
      }),
    )
    return movements.filter(
      (movement): movement is MovementsByBlock => movement !== null,
    ) as MovementsByBlock[]
  }

  protected async getProtocolTokenApr({
    protocolTokenAddress,
    blockNumber,
  }: GetAprInput): Promise<number> {
    const lensContract = MorphoAaveV2Lens__factory.connect(
      this.lensAddress,
      this._provider,
    )
    const positionType = this.getProtocolDetails().positionType
    let rate: bigint
    if (positionType === PositionType.Supply) {
      ;[rate, ,] = await lensContract.getAverageSupplyRatePerYear(
        protocolTokenAddress,
        {
          blockTag: blockNumber,
        },
      )
    } else {
      ;[rate, ,] = await lensContract.getAverageBorrowRatePerYear(
        protocolTokenAddress,
        {
          blockTag: blockNumber,
        },
      )
    }
    return Number(rate) / RAY
  }

  async getApr({
    protocolTokenAddress,
    blockNumber,
  }: GetAprInput): Promise<ProtocolTokenApr> {
    const apr = await this.getProtocolTokenApr({
      protocolTokenAddress,
      blockNumber,
    })
    return {
      ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
      aprDecimal: apr * 100,
    }
  }

  async getApy({
    protocolTokenAddress,
    blockNumber,
  }: GetApyInput): Promise<ProtocolTokenApy> {
    const apr = await this.getProtocolTokenApr({
      protocolTokenAddress,
      blockNumber,
    })
    const apy = aprToApy(apr, SECONDS_PER_YEAR)

    return {
      ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
      apyDecimal: apy * 100,
    }
  }
}
