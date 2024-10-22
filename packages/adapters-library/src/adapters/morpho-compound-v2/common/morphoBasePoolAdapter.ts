import { getAddress } from 'ethers'
import * as WadMath from 'evm-maths/lib/wad'
import { AdaptersController } from '../../../core/adaptersController'
import { ZERO_ADDRESS } from '../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../core/constants/chains'
import { CacheToDb } from '../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../core/provider/CustomJsonRpcProvider'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { Helpers } from '../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../types/IProtocolAdapter'
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
  TokenBalance,
  TokenType,
  Underlying,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../types/adapter'
import { Erc20Metadata } from '../../../types/erc20Metadata'
import { Protocol } from '../../protocols'
import {
  CToken__factory,
  MorphoCompoundLens__factory,
  MorphoCompound__factory,
} from '../contracts'
import { SuppliedEvent } from '../contracts/MorphoCompound'
import {
  TypedContractEvent,
  TypedDeferredTopicFilter,
} from '../contracts/common'

const morphoCompoundV2ContractAddresses: Partial<
  Record<Protocol, Partial<Record<Chain, string>>>
> = {
  [Protocol.MorphoCompoundV2]: {
    [Chain.Ethereum]: getAddress('0x8888882f8f843896699869179fb6e4f7e3b58888'),
  },
}

export abstract class MorphoBasePoolAdapter implements IProtocolAdapter {
  abstract productId: string
  protocolId: Protocol
  chainId: Chain
  helpers: Helpers

  abstract adapterSettings: AdapterSettings

  private provider: CustomJsonRpcProvider

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
    helpers,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
    this.helpers = helpers
  }

  lensAddress = getAddress('0x930f1b46e1d081ec1524efd95752be3ece51ef67')

  adaptersController: AdaptersController

  abstract getProtocolDetails(): ProtocolDetails

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const morphoCompoundContract = MorphoCompound__factory.connect(
      morphoCompoundV2ContractAddresses[this.protocolId]![this.chainId]!,
      this.provider,
    )

    const markets = await morphoCompoundContract.getAllMarkets()

    return await Promise.all(
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

        return {
          ...protocolToken,
          underlyingTokens: [underlyingToken],
        }
      }),
    )
  }

  private async getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const {
      underlyingTokens: [underlyingToken],
    } = await this.getProtocolTokenByAddress(protocolTokenBalance.address)

    const underlyingTokenBalance = {
      ...underlyingToken!,
      balanceRaw: protocolTokenBalance.balanceRaw,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

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
      let balanceRaw: bigint
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
          const protocolToken = await this.getProtocolTokenByAddress(
            protocolTokenBalance.address,
          )

          const completeTokenBalance: TokenBalance = {
            address: protocolTokenBalance.address,
            balanceRaw: protocolTokenBalance.balance,
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
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
            name: protocolToken.name,
            symbol: protocolToken.symbol,
            decimals: protocolToken.decimals,
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
    protocolTokenAddresses,
  }: GetTotalValueLockedInput): Promise<ProtocolTokenTvl[]> {
    const tokens = await this.getProtocolTokens()
    const lensContract = MorphoCompoundLens__factory.connect(
      this.lensAddress,
      this.provider,
    )
    const positionType = this.getProtocolDetails().positionType
    const result = await Promise.all(
      tokens.map(async (tokenMetadata) => {
        if (
          protocolTokenAddresses &&
          !protocolTokenAddresses.includes(tokenMetadata.address)
        ) {
          return undefined
        }

        let totalValueRaw: bigint

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
          address: tokenMetadata.address,
          symbol: tokenMetadata.symbol,
          name: tokenMetadata.name,
          decimals: tokenMetadata.decimals,
          type: TokenType.Protocol,
          totalSupplyRaw: totalValueRaw !== undefined ? totalValueRaw : 0n,
        }
      }),
    )

    return result.filter((result): result is ProtocolTokenTvl =>
      Boolean(result),
    )
  }

  async unwrap(_input: UnwrapInput): Promise<UnwrapExchangeRate> {
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

    const {
      underlyingTokens: [underlyingToken],
      ...protocolToken
    } = await this.getProtocolTokenByAddress(protocolTokenAddress)

    let filter: TypedDeferredTopicFilter<
      TypedContractEvent<
        SuppliedEvent.InputTuple,
        SuppliedEvent.OutputTuple,
        SuppliedEvent.OutputObject
      >
    >
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

  private async getProtocolTokenByAddress(protocolTokenAddress: string) {
    return this.helpers.getProtocolTokenByAddress({
      protocolTokens: await this.getProtocolTokens(),
      protocolTokenAddress,
    })
  }
}

// NOTE: The APY/APR feature has been removed as of March 2024.
// The below contains logic that may be useful for future features or reference. For more context on this decision, refer to ticket [MMI-4731].

// private async _getProtocolTokenApr({
//   protocolTokenAddress,
//   blockNumber,
// }: GetAprInput): Promise<number> {
//   const lensContract = MorphoCompoundLens__factory.connect(
//     this.lensAddress,
//     this.provider,
//   )
//   const positionType = this.getProtocolDetails().positionType
//   let rate: bigint
//   if (positionType === PositionType.Supply) {
//     ;[rate, ,] = await lensContract.getAverageSupplyRatePerBlock(
//       protocolTokenAddress,
//       {
//         blockTag: blockNumber,
//       },
//     )
//   } else {
//     ;[rate, ,] = await lensContract.getAverageBorrowRatePerBlock(
//       protocolTokenAddress,
//       {
//         blockTag: blockNumber,
//       },
//     )
//   }
//   rate = rate * BigInt(AVERAGE_BLOCKS_PER_DAY[this.chainId]) * 365n
//   return Number(rate) / WAD
// }

// async getApr({
//   protocolTokenAddress,
//   blockNumber,
// }: GetAprInput): Promise<ProtocolTokenApr> {
//   const apr = await this._getProtocolTokenApr({
//     protocolTokenAddress,
//     blockNumber,
//   })
//   return {
//     ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
//     aprDecimal: Number(apr) * 100,
//   }
// }

// async getApy({
//   protocolTokenAddress,
//   blockNumber,
// }: GetApyInput): Promise<ProtocolTokenApy> {
//   const apr = await this._getProtocolTokenApr({
//     protocolTokenAddress,
//     blockNumber,
//   })
//   const apy = aprToApy(apr, 365)
//   return {
//     ...(await this.fetchProtocolTokenMetadata(protocolTokenAddress)),
//     apyDecimal: apy * 100,
//   }
// }
