import { getAddress } from 'ethers'
import * as WadMath from 'evm-maths/lib/wad'
import { AdaptersController } from '../../../core/adaptersController'
import { AVERAGE_BLOCKS_PER_DAY } from '../../../core/constants/AVERAGE_BLOCKS_PER_DAY'
import { Chain } from '../../../core/constants/chains'
import { WAD } from '../../../core/constants/WAD'
import { ZERO_ADDRESS } from '../../../core/constants/ZERO_ADDRESS'
import { IMetadataBuilder } from '../../../core/decorators/cacheToFile'
import {
  ResolveUnderlyingMovements,
  ResolveUnderlyingPositions,
} from '../../../core/decorators/resolveUnderlyingPositions'
import { NotImplementedError } from '../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'
import { aprToApy } from '../../../core/utils/aprToApy'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { logger } from '../../../core/utils/logger'
import {
  GetPositionsInput,
  GetEventsInput,
  GetApyInput,
  GetAprInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolTokenTvl,
  ProtocolPosition,
  TokenBalance,
  TokenType,
  Underlying,
  GetConversionRateInput,
  ProtocolTokenUnderlyingRate,
} from '../../../types/adapter'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import { Protocol } from '../../protocols'
import {
  MorphoCompound__factory,
  CToken__factory,
  MorphoCompoundLens__factory,
} from '../contracts'

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
    [Chain.Ethereum]: getAddress('0x8888882f8f843896699869179fb6e4f7e3b58888'),
  },
}

export abstract class MorphoBasePoolAdapter implements IMetadataBuilder {
  protocolId: Protocol
  chainId: Chain

  private provider: CustomJsonRpcProvider

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

  lensAddress = getAddress('0x930f1b46e1d081ec1524efd95752be3ece51ef67')

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
      this.provider,
    )

    const metadataObject: MorphoCompoundV2PeerToPoolAdapterMetadata = {}

    const markets = await morphoCompoundContract.getAllMarkets()

    await Promise.all(
      markets.map(async (marketAddress) => {
        const cTokenContract = CToken__factory.connect(
          marketAddress,
          this.provider,
        )

        const supplyTokenAddress = await cTokenContract
          .underlying()
          .catch((err) => {
            if (err) return ZERO_ADDRESS
            throw err
          })

        const [protocolToken, underlyingToken] = await Promise.all([
          getTokenMetadata(marketAddress, this.chainId, this.provider),
          getTokenMetadata(supplyTokenAddress, this.chainId, this.provider),
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

  private async fetchProtocolTokenMetadata(
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

  private async getUnderlyingTokenBalances({
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

  private async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken } = await this._fetchPoolMetadata(
      protocolTokenAddress,
    )

    return [underlyingToken]
  }

  @ResolveUnderlyingPositions
  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    const lensContract = MorphoCompoundLens__factory.connect(
      this.lensAddress,
      this.provider,
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
          const tokenMetadata = await this.fetchProtocolTokenMetadata(
            protocolTokenBalance.address,
          )

          const completeTokenBalance: TokenBalance = {
            address: protocolTokenBalance.address,
            balanceRaw: protocolTokenBalance.balance,
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

  @ResolveUnderlyingMovements
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

  @ResolveUnderlyingMovements
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

  @ResolveUnderlyingMovements
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

  @ResolveUnderlyingMovements
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
      this.provider,
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
          this.provider,
        )
        const exchangeRate = await cTokenContract.exchangeRateStored({
          blockTag: blockNumber,
        })

        totalValueRaw = WadMath.wadDiv(totalValueRaw, exchangeRate)

        return {
          ...tokenMetadata,
          type: TokenType.Protocol,
          totalSupplyRaw: totalValueRaw !== undefined ? totalValueRaw : 0n,
        }
      }),
    )
  }

  async getProtocolTokenToUnderlyingTokenRate(
    _input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate> {
    throw new NotImplementedError()
  }

  private async _getMovements({
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
      morphoCompoundV2ContractAddresses[this.protocolId]![this.chainId]!,
      this.provider,
    )

    const protocolToken = await this.fetchProtocolTokenMetadata(
      protocolTokenAddress,
    )
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata(
      protocolTokenAddress,
    )

    let filter
    switch (eventType) {
      case 'supplied':
        filter = morphoCompoundContract.filters.Supplied(
          undefined,
          userAddress,
          protocolTokenAddress,
        )
        break
      case 'withdrawn':
        filter = morphoCompoundContract.filters.Withdrawn(
          userAddress,
          undefined,
          protocolTokenAddress,
        )
        break
      case 'repaid':
        filter = morphoCompoundContract.filters.Repaid(
          undefined,
          userAddress,
          protocolTokenAddress,
        )

        break
      case 'borrowed':
        filter = morphoCompoundContract.filters.Borrowed(
          userAddress,
          protocolTokenAddress,
        )

        break
    }

    const eventResults = await morphoCompoundContract.queryFilter(
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
              balanceRaw: eventData._amount,
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

  private async _getProtocolTokenApr({
    protocolTokenAddress,
    blockNumber,
  }: GetAprInput): Promise<number> {
    const lensContract = MorphoCompoundLens__factory.connect(
      this.lensAddress,
      this.provider,
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
      ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
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
      ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
      apyDecimal: apy * 100,
    }
  }
}
