import * as WadMath from 'evm-maths/lib/wad'
import { AdaptersController } from '../../../core/adaptersController'
import { AVERAGE_BLOCKS_PER_DAY } from '../../../core/constants/AVERAGE_BLOCKS_PER_DAY'
import { Chain } from '../../../core/constants/chains'
import { WAD } from '../../../core/constants/WAD'
import { ZERO_ADDRESS } from '../../../core/constants/ZERO_ADDRESS'
import { IMetadataBuilder } from '../../../core/decorators/cacheToFile'
import { NotImplementedError } from '../../../core/errors/errors'
import { aprToApy } from '../../../core/utils/aprToApy'

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
  UnderlyingTokenRate,
} from '../../../types/adapter'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import { Protocol } from '../../protocols'
import {
  MorphoCompound__factory,
  CToken__factory,
  MorphoCompoundLens__factory,
} from '../contracts'
import {
  SuppliedEvent,
  WithdrawnEvent,
  BorrowedEvent,
  RepaidEvent,
} from '../contracts/MorphoCompound'
import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'

type MorphoCompoundV2PeerToPoolAdapterMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
  }
>

const morphoCompoundV2ContractAddresses: Partial<
  Record<Protocol, Partial<Record<Chain, string>>>
> = {
  [Protocol.MorphoCompoundV2]: {
    [Chain.Ethereum]: '0x8888882f8f843896699869179fb6e4f7e3b58888',
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

  lensAddress = '0x930f1b46e1d081ec1524efd95752be3ece51ef67'

  adaptersController: AdaptersController

  abstract getProtocolDetails(): ProtocolDetails

  private _metadataCache: MorphoCompoundV2PeerToPoolAdapterMetadata | null =
    null

  async buildMetadata() {
    if (this._metadataCache) {
      return this._metadataCache
    }

    const morphoCompoundContract = MorphoCompound__factory.connect(
      morphoCompoundV2ContractAddresses[this.protocolId]![this.chainId]!,
      this._provider,
    )

    const metadataObject: MorphoCompoundV2PeerToPoolAdapterMetadata = {}

    const markets = await morphoCompoundContract.getAllMarkets()

    await Promise.all(
      markets.map(async (marketAddress) => {
        const cTokenContract = CToken__factory.connect(
          marketAddress,
          this._provider,
        )

        const supplyTokenAddress = await cTokenContract
          .underlying()
          .catch((err) => {
            if (err) return ZERO_ADDRESS
            throw err
          })

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

  protected async _fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this._fetchPoolMetadata(
      protocolTokenAddress,
    )

    return protocolToken
  }

  private async _fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

  protected async _getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const { underlyingToken } = await this._fetchPoolMetadata(
      protocolTokenBalance.address,
    )

    const underlyingTokenBalance = {
      ...underlyingToken,
      balanceRaw: protocolTokenBalance.balanceRaw,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async _fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken } = await this._fetchPoolMetadata(
      protocolTokenAddress,
    )

    return [underlyingToken]
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const lensContract = MorphoCompoundLens__factory.connect(
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
          balance: amount,
        }
      }),
    )

    const protocolTokens: ProtocolPosition[] = await Promise.all(
      protocolTokensBalances
        .filter((protocolTokenBalance) => protocolTokenBalance.balance !== 0n) // Filter out balances equal to 0
        .map(async (protocolTokenBalance) => {
          const tokenMetadata = await this._fetchProtocolTokenMetadata(
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
    return this._getMovements({
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
    return this._getMovements({
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
    return this._getMovements({
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
    return this._getMovements({
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
    const tokens = await this.getProtocolTokens()
    const lensContract = MorphoCompoundLens__factory.connect(
      this.lensAddress,
      this._provider,
    )
    const positionType = this.getProtocolDetails().positionType
    return Promise.all(
      tokens.map(async (tokenMetadata) => {
        let totalValueRaw

        if (positionType === PositionType.Supply) {
          const [p2pSupply, poolSupply] =
            await lensContract.getTotalMarketSupply(tokenMetadata.address, {
              blockTag: blockNumber,
            })
          totalValueRaw = poolSupply + p2pSupply
        } else {
          const [p2pBorrow, poolBorrow] =
            await lensContract.getTotalMarketBorrow(tokenMetadata.address, {
              blockTag: blockNumber,
            })
          totalValueRaw = poolBorrow + p2pBorrow
        }

        const cTokenContract = CToken__factory.connect(
          tokenMetadata.address,
          this._provider,
        )
        const exchangeRate = await cTokenContract.exchangeRateStored()

        totalValueRaw = WadMath.wadDiv(totalValueRaw, exchangeRate)

        return {
          ...tokenMetadata,
          type: TokenType.Protocol,
          totalSupplyRaw: totalValueRaw !== undefined ? totalValueRaw : 0n,
        }
      }),
    )
  }

  protected async _getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    const cTokenContract = CToken__factory.connect(
      protocolTokenMetadata.address,
      this._provider,
    )
    const exchangeRate = await cTokenContract.exchangeRateStored()

    const { underlyingToken } = await this._fetchPoolMetadata(
      protocolTokenMetadata.address,
    )
    const pricePerShareRaw = 1n / exchangeRate // as is is expected the underlyingRateRaw, we do not scale back as stated in the compound doc: https://docs.compound.finance/v2/ctokens/#exchange-rate
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

  protected _extractEventData(
    eventLog:
      | SuppliedEvent.Log
      | WithdrawnEvent.Log
      | RepaidEvent.Log
      | BorrowedEvent.Log,
  ) {
    return eventLog.args
  }

  protected _castEventToLogType(
    event: unknown,
    eventType: 'supplied' | 'withdrawn' | 'repaid' | 'borrowed',
  ):
    | SuppliedEvent.Log
    | WithdrawnEvent.Log
    | RepaidEvent.Log
    | BorrowedEvent.Log {
    switch (eventType) {
      case 'supplied':
        return event as SuppliedEvent.Log
      case 'withdrawn':
        return event as WithdrawnEvent.Log
      case 'repaid':
        return event as RepaidEvent.Log
      case 'borrowed':
        return event as BorrowedEvent.Log
      default:
        throw new Error('Invalid event type')
    }
  }

  protected async _getMovements({
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
    const morphoCompoundContract = MorphoCompound__factory.connect(
      protocolTokenAddress,
      this._provider,
    )

    let filter
    switch (eventType) {
      case 'supplied':
        filter = morphoCompoundContract.filters.Supplied(undefined, userAddress)
        break
      case 'withdrawn':
        filter = morphoCompoundContract.filters.Withdrawn(userAddress)
        break
      case 'repaid':
        filter = morphoCompoundContract.filters.Repaid(undefined, userAddress)
        break
      case 'borrowed':
        filter = morphoCompoundContract.filters.Borrowed(userAddress)
        break
    }

    const eventResults = await morphoCompoundContract.queryFilter(
      filter,
      fromBlock,
      toBlock,
    )

    const movements = await Promise.all(
      eventResults.map(async (event) => {
        const castedEvent = this._castEventToLogType(event, eventType)
        const eventData = this._extractEventData(castedEvent)
        if (!eventData) {
          return null
        }

        const protocolToken = await this._fetchProtocolTokenMetadata(
          eventData._poolToken,
        )
        const underlyingTokens = await this._fetchUnderlyingTokensMetadata(
          eventData._poolToken,
        )

        const tokens: Underlying[] = underlyingTokens.map(
          (underlyingToken) => ({
            ...underlyingToken,
            balanceRaw: eventData._amount,
            type: TokenType.Underlying,
          }),
        )

        return {
          protocolToken,
          tokens,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        }
      }),
    )

    return movements.filter(
      (movement): movement is MovementsByBlock => movement !== null,
    ) as MovementsByBlock[]
  }

  protected async _getProtocolTokenApr({
    protocolTokenAddress,
    blockNumber,
  }: GetAprInput): Promise<number> {
    const lensContract = MorphoCompoundLens__factory.connect(
      this.lensAddress,
      this._provider,
    )
    const positionType = this.getProtocolDetails().positionType
    let rate: bigint
    if (positionType === PositionType.Supply) {
      ;[rate, ,] = await lensContract.getAverageSupplyRatePerBlock(
        protocolTokenAddress,
        {
          blockTag: blockNumber,
        },
      )
    } else {
      ;[rate, ,] = await lensContract.getAverageBorrowRatePerBlock(
        protocolTokenAddress,
        {
          blockTag: blockNumber,
        },
      )
    }
    rate = rate * BigInt(AVERAGE_BLOCKS_PER_DAY[this.chainId]) * 365n
    return Number(rate) / WAD
  }

  async getApr({
    protocolTokenAddress,
    blockNumber,
  }: GetAprInput): Promise<ProtocolTokenApr> {
    const apr = await this._getProtocolTokenApr({
      protocolTokenAddress,
      blockNumber,
    })
    return {
      ...(await this._fetchProtocolTokenMetadata(protocolTokenAddress)),
      aprDecimal: Number(apr) * 100,
    }
  }

  async getApy({
    protocolTokenAddress,
    blockNumber,
  }: GetApyInput): Promise<ProtocolTokenApy> {
    const apr = await this._getProtocolTokenApr({
      protocolTokenAddress,
      blockNumber,
    })
    const apy = aprToApy(apr, 365)
    return {
      ...(await this._fetchProtocolTokenMetadata(protocolTokenAddress)),
      apyDecimal: apy * 100,
    }
  }
}
