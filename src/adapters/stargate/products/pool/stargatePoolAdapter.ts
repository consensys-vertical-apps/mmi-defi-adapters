import { ethers } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { StargateToken__factory } from '../../../../contracts'
import { TransferEvent } from '../../../../contracts/Erc20'
import { AVERAGE_BLOCKS_PER_DAY } from '../../../../core/constants/AVERAGE_BLOCKS_PER_DAY'
import { Chain } from '../../../../core/constants/chains'
import { Protocol } from '../../../../core/constants/protocols'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { getBalances } from '../../../../core/utils/getBalancesFactory'
import { calculateProfit } from '../../../../core/utils/calculateProfit'
import { aggregateTrades } from '../../../../core/utils/aggregateTrades'
import {
  GetEventsInput,
  GetPositionsInput,
  GetPricesInput,
  GetProfitsInput,
  GetTotalValueLockedInput,
  IProtocolAdapter,
  ProtocolDetails,
  TradeEvent,
  PositionType,
  TokenType,
  ProfitsTokensWithRange,
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockedToken,
} from '../../../../types/adapter'
import { StargatePoolMetadata } from '../../buildMetadata'
import { protocolTokenToMap } from '../../../../core/utils/protocolTokenToMap'

export class StargatePoolAdapter implements IProtocolAdapter {
  private metadata: StargatePoolMetadata
  private provider: ethers.providers.StaticJsonRpcProvider
  private chainId: Chain

  constructor({
    metadata,
    provider,
    chainId,
  }: {
    metadata: StargatePoolMetadata
    provider: ethers.providers.StaticJsonRpcProvider
    chainId: Chain
  }) {
    this.metadata = metadata
    this.provider = provider
    this.chainId = chainId
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: Protocol.Stargate,
      name: 'Stargate',
      description:
        'Stargate is a fully composable liquidity transport protocol that lives at the heart of Omnichain DeFi',
      siteUrl: 'https://stargate.finance/',
      iconUrl: 'https://stargate.finance/favicons/favicon-light.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
    }
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolToken[]> {
    const protocolToken = Object.values(this.metadata).map(
      ({ protocolToken }) => protocolToken,
    )

    const protocolTokensBalances = await getBalances({
      chainId: this.chainId,
      provider: this.provider,
      userAddress,
      blockNumber,
      tokens: protocolToken,
    })

    const underlying = await Promise.all(
      protocolTokensBalances.map(async (protocolTokenBalance) => {
        const amountLPtoLD = await this.stargateTokenContract(
          protocolTokenBalance.address,
        ).amountLPtoLD(protocolTokenBalance.balanceRaw)

        const underlyingTokenMetadata =
          this.metadata[protocolTokenBalance.address].underlying

        return {
          ...underlyingTokenMetadata,
          balanceRaw: BigInt(amountLPtoLD.toString()),
          balance: formatUnits(amountLPtoLD, underlyingTokenMetadata.decimals),
          type: TokenType.Underlying,
        }
      }),
    )

    const tokens = protocolTokensBalances.map((protocolTokenBalance, index) => {
      return {
        ...protocolTokenBalance,
        type: TokenType.Protocol,
        tokens: [underlying[index]],
      }
    })

    return tokens
  }
  async getPricePerShare({
    blockNumber,
  }: GetPricesInput): Promise<ProtocolPricePerShareToken[]> {
    const tokens = await Promise.all(
      Object.values(this.metadata).map(
        async ({ protocolToken, underlying: underlyingToken }) => {
          const oneToken = BigInt(1 * 10 ** protocolToken.decimals)

          const pricePerShareRaw = await this.stargateTokenContract(
            protocolToken.address,
          ).amountLPtoLD(oneToken, {
            blockTag: blockNumber,
          })

          const pricePerShare = formatUnits(
            pricePerShareRaw,
            underlyingToken.decimals,
          )

          return {
            ...protocolToken,
            share: 1,
            type: TokenType.Protocol,
            tokens: [
              {
                ...underlyingToken,
                type: TokenType.Underlying,
                pricePerShareRaw: BigInt(pricePerShareRaw.toString()),
                pricePerShare,
              },
            ],
          }
        },
      ),
    )

    return tokens
  }
  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTotalValueLockedToken[]> {
    // TODO
    return []
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<TradeEvent[]> {
    const contractFilter = this.stargateTokenContract(
      protocolTokenAddress,
    ).filters.Transfer(userAddress, ZERO_ADDRESS)

    const eventResults = await this.stargateTokenContract(
      protocolTokenAddress,
    ).queryFilter<TransferEvent>(contractFilter, fromBlock, toBlock)

    return await this.eventUtil({
      protocolTokenAddress,
      eventResults,
      metadata: this.metadata,
    })
  }

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<TradeEvent[]> {
    const contractFilter = this.stargateTokenContract(
      protocolTokenAddress,
    ).filters.Transfer(ZERO_ADDRESS, userAddress)

    const eventResults = await this.stargateTokenContract(
      protocolTokenAddress,
    ).queryFilter<TransferEvent>(contractFilter, fromBlock, toBlock)

    return await this.eventUtil({
      protocolTokenAddress,
      eventResults,
      metadata: this.metadata,
    })
  }

  async getOneDayProfit({
    userAddress,
    blockNumber,
  }: GetProfitsInput): Promise<ProfitsTokensWithRange> {
    const toBlock = blockNumber
    const fromBlock = toBlock - AVERAGE_BLOCKS_PER_DAY[this.chainId]

    const [currentValues, previousValues] = await Promise.all(
      [
        this.getPositions({
          userAddress,
          blockNumber: toBlock,
        }),
        this.getPositions({
          userAddress,
          blockNumber: fromBlock,
        }),
      ].map(async (positions) => protocolTokenToMap(await positions)),
    )

    const tokens = await Promise.all(
      Object.values(currentValues).map(
        async ({ protocolTokenMetadata, underlyingTokens }) => {
          const getEventsInput: GetEventsInput = {
            userAddress,
            protocolTokenAddress: protocolTokenMetadata.address,
            fromBlock,
            toBlock,
          }

          const [withdrawal, deposits] = await Promise.all(
            [
              this.getWithdrawals(getEventsInput),
              this.getDeposits(getEventsInput),
            ].map(async (tradeEvents) => aggregateTrades(await tradeEvents)),
          )

          const profits = calculateProfit(
            deposits,
            withdrawal,
            underlyingTokens,
            previousValues[protocolTokenMetadata.address]?.underlyingTokens ??
              {},
          )

          return {
            ...protocolTokenMetadata,
            type: TokenType.Protocol,
            tokens: Object.values(underlyingTokens).map((underlyingToken) => {
              return {
                ...underlyingToken,
                profit: formatUnits(
                  profits[underlyingToken.address],
                  underlyingToken.decimals,
                ),
                type: TokenType.Underlying,
              }
            }),
          }
        },
      ),
    )

    return { tokens, fromBlock, toBlock }
  }

  async getClaimedRewards(_input: GetEventsInput): Promise<TradeEvent[]> {
    return []
  }

  eventUtil({
    protocolTokenAddress,
    eventResults,
    metadata,
  }: {
    protocolTokenAddress: string
    eventResults: TransferEvent[]
    metadata: StargatePoolMetadata
  }): Promise<TradeEvent[]> {
    return Promise.all(
      eventResults.map(async (transferEvent) => {
        const {
          blockNumber,
          args: { value },
        } = transferEvent

        const lpPrices = await this.getPricePerShare({ blockNumber })

        const tradeEventValue = lpPrices.find(
          (prices) => prices.address == protocolTokenAddress,
        )

        const { address } = metadata[protocolTokenAddress].underlying
        const { decimals } = metadata[protocolTokenAddress].protocolToken

        const pricePerShareRaw = tradeEventValue?.tokens?.[0]?.pricePerShareRaw
        if (!pricePerShareRaw) {
          throw new Error('No price for events at this time')
        }

        return {
          trades: {
            [address]: +formatUnits(
              BigInt(value.toString()) * pricePerShareRaw,
              decimals,
            ),
          },
          protocolTokenAddress:
            metadata[protocolTokenAddress].protocolToken.address,
          blockNumber,
        }
      }),
    )
  }

  private stargateTokenContract(address: string) {
    return StargateToken__factory.connect(address, this.provider)
  }
}
