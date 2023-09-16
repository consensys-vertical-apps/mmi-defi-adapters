import type { ethers } from 'ethers'
import { formatUnits } from 'ethers'
import { Protocol } from '../../adapters/index.js'
import { TransferEvent } from '../../contracts/Erc20.js'
import { Erc20__factory } from '../../contracts/index.js'
import {
  BasePricePerShareToken,
  BaseToken,
  BaseTokenMovement,
  GetAprInput,
  GetApyInput,
  GetEventsInput,
  GetPositionsInput,
  GetPricesInput,
  GetProfitsInput,
  GetTotalValueLockedInput,
  IProtocolAdapter,
  MovementsByBlock,
  ProfitsTokensWithRange,
  ProtocolAdapterParams,
  ProtocolAprToken,
  ProtocolApyToken,
  ProtocolDetails,
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockedToken,
  TokenBalance,
  TokenType,
} from '../../types/adapter.js'
import { AVERAGE_BLOCKS_PER_DAY } from '../constants/AVERAGE_BLOCKS_PER_DAY.js'
import { Chain } from '../constants/chains.js'
import { ZERO_ADDRESS } from '../constants/ZERO_ADDRESS.js'
import { aggregateTrades } from '../utils/aggregateTrades.js'
import { calculateProfit } from '../utils/calculateProfit.js'
import { getBalances } from '../utils/getBalances.js'
import { Erc20Metadata } from '../utils/getTokenMetadata.js'
import { formatProtocolTokenArrayToMap } from '../utils/protocolTokenToMap.js'

export abstract class SimplePoolAdapter implements IProtocolAdapter {
  chainId: Chain
  protocolId: Protocol

  protected provider: ethers.JsonRpcProvider

  constructor({ provider, chainId, protocolId }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
  }

  abstract getProtocolDetails(): ProtocolDetails

  abstract getProtocolTokens(): Promise<Erc20Metadata[]>

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolToken[]> {
    const protocolTokensBalances = await getBalances({
      chainId: this.chainId,
      provider: this.provider,
      userAddress,
      blockNumber,
      tokens: await this.getProtocolTokens(),
    })

    const protocolTokens: ProtocolToken[] = await Promise.all(
      protocolTokensBalances.map(async (protocolTokenBalance) => {
        const underlyingTokenBalances = await this.getUnderlyingTokenBalances(
          protocolTokenBalance,
        )

        return {
          ...protocolTokenBalance,
          type: TokenType.Protocol,
          tokens: underlyingTokenBalances,
        }
      }),
    )

    return protocolTokens
  }

  async getPricePerShare({
    blockNumber,
    protocolTokenAddress,
  }: GetPricesInput): Promise<ProtocolPricePerShareToken> {
    const protocolTokenMetadata = await this.fetchProtocolTokenMetadata(
      protocolTokenAddress,
    )

    const underlyingTokenPricesPerShare =
      await this.getUnderlyingTokenPricesPerShare(
        protocolTokenMetadata,
        blockNumber,
      )

    return {
      ...protocolTokenMetadata,
      share: 1,
      type: TokenType.Protocol,
      tokens: underlyingTokenPricesPerShare,
    }
  }

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getMovements({
      protocolTokenAddress,
      underlyingTokens: await this.getUnderlyingTokens(protocolTokenAddress),
      fromBlock,
      toBlock,
      from: ZERO_ADDRESS,
      to: userAddress,
    })
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    return await this.getMovements({
      protocolTokenAddress,
      underlyingTokens: await this.getUnderlyingTokens(protocolTokenAddress),
      fromBlock,
      toBlock,
      from: userAddress,
      to: ZERO_ADDRESS,
    })
  }

  abstract getClaimedRewards(input: GetEventsInput): Promise<MovementsByBlock[]>

  abstract getTotalValueLocked(
    input: GetTotalValueLockedInput,
  ): Promise<ProtocolTotalValueLockedToken[]>

  async getOneDayProfit({
    userAddress,
    blockNumber,
  }: GetProfitsInput): Promise<ProfitsTokensWithRange> {
    const toBlock = blockNumber
    const fromBlock = toBlock - AVERAGE_BLOCKS_PER_DAY[this.chainId]

    const [currentValues, previousValues] = await Promise.all([
      this.getPositions({
        userAddress,
        blockNumber: toBlock,
      }).then(formatProtocolTokenArrayToMap),
      this.getPositions({
        userAddress,
        blockNumber: fromBlock,
      }).then(formatProtocolTokenArrayToMap),
    ])

    const tokens = await Promise.all(
      Object.values(currentValues).map(
        async ({ protocolTokenMetadata, underlyingTokenPositions }) => {
          const getEventsInput: GetEventsInput = {
            userAddress,
            protocolTokenAddress: protocolTokenMetadata.address,
            fromBlock,
            toBlock,
          }

          const [withdrawals, deposits] = await Promise.all([
            this.getWithdrawals(getEventsInput).then(aggregateTrades),
            this.getDeposits(getEventsInput).then(aggregateTrades),
          ])

          const profits = calculateProfit({
            deposits,
            withdrawals,
            currentValues: underlyingTokenPositions,
            previousVales:
              previousValues[protocolTokenMetadata.address]
                ?.underlyingTokenPositions ?? {},
          })

          return {
            ...protocolTokenMetadata,
            type: TokenType.Protocol,
            tokens: Object.values(underlyingTokenPositions).map(
              (underlyingToken) => {
                return {
                  ...underlyingToken,
                  profitRaw: profits[underlyingToken.address]!,
                  profit: formatUnits(
                    profits[underlyingToken.address]!,
                    underlyingToken.decimals,
                  ),
                  type: TokenType.Underlying,
                }
              },
            ),
          }
        },
      ),
    )

    return { tokens, fromBlock, toBlock }
  }

  abstract getApy(input: GetApyInput): Promise<ProtocolApyToken>

  abstract getApr(input: GetAprInput): Promise<ProtocolAprToken>

  protected abstract fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata>

  protected abstract getUnderlyingTokens(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]>

  protected abstract getUnderlyingTokenBalances(
    protocolTokenBalance: TokenBalance,
  ): Promise<BaseToken[]>

  protected abstract getUnderlyingTokenPricesPerShare(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number,
  ): Promise<BasePricePerShareToken[]>

  private async getMovements({
    protocolTokenAddress,
    underlyingTokens,
    fromBlock,
    toBlock,
    from,
    to,
  }: {
    protocolTokenAddress: string
    underlyingTokens: Erc20Metadata[]
    fromBlock: number
    toBlock: number
    from: string
    to: string
  }): Promise<MovementsByBlock[]> {
    const protocolTokenContract = Erc20__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    const filter = protocolTokenContract.filters.Transfer(from, to)

    const eventResults =
      await protocolTokenContract.queryFilter<TransferEvent.Event>(
        filter,
        fromBlock,
        toBlock,
      )

    return await Promise.all(
      eventResults.map(async (transferEvent) => {
        const {
          blockNumber,
          args: { value },
        } = transferEvent

        const protocolTokenPrice = await this.getPricePerShare({
          blockNumber,
          protocolTokenAddress,
        })

        const pricePerShareRaw =
          protocolTokenPrice.tokens?.[0]?.pricePerShareRaw
        if (!pricePerShareRaw) {
          throw new Error('No price for events at this time')
        }

        const movementValueRaw = BigInt(value.toString()) * pricePerShareRaw
        return {
          underlyingTokensMovement: underlyingTokens.reduce(
            (accummulator, currentToken) => {
              return {
                ...accummulator,
                [currentToken.address]: {
                  ...currentToken,
                  movementValueRaw,
                  movementValue: formatUnits(
                    movementValueRaw,
                    currentToken.decimals,
                  ),
                },
              }
            },
            {} as Record<string, BaseTokenMovement>,
          ),
          blockNumber,
        }
      }),
    )
  }
}
