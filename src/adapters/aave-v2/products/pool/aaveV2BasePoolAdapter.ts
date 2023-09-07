import { ethers } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { Erc20__factory } from '../../../../contracts'
import { TransferEvent } from '../../../../contracts/Erc20'
import { AVERAGE_BLOCKS_PER_DAY } from '../../../../core/constants/AVERAGE_BLOCKS_PER_DAY'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import { aggregateTrades } from '../../../../core/utils/aggregateTrades'
import { calculateProfit } from '../../../../core/utils/calculateProfit'
import { getBalances } from '../../../../core/utils/getBalances'
import { Erc20Metadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import { formatProtocolTokenArrayToMap } from '../../../../core/utils/protocolTokenToMap'
import {
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
  ProtocolAprToken,
  ProtocolApyToken,
  ProtocolDetails,
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockedToken,
  TokenType,
} from '../../../../types/adapter'
import { AaveV2PoolMetadata } from '../../buildMetadata'

export abstract class AaveV2BasePoolAdapter implements IProtocolAdapter {
  private metadata: AaveV2PoolMetadata
  private provider: ethers.providers.StaticJsonRpcProvider
  protected chainId: Chain

  constructor({
    metadata,
    provider,
    chainId,
  }: {
    metadata: AaveV2PoolMetadata
    provider: ethers.providers.StaticJsonRpcProvider
    chainId: Chain
  }) {
    this.metadata = metadata
    this.provider = provider
    this.chainId = chainId
  }

  abstract getProtocolDetails(): ProtocolDetails

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(this.metadata).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const { protocolToken, underlyingToken } =
      this.fetchProtocolTokenMetadata(protocolTokenAddress)

    const protocolTokenContract =
      this.protocolTokenContract(protocolTokenAddress)

    const filter = protocolTokenContract.filters.Transfer(
      userAddress,
      ZERO_ADDRESS,
    )

    const eventResults = await protocolTokenContract.queryFilter<TransferEvent>(
      filter,
      fromBlock,
      toBlock,
    )

    return await this.eventUtil({
      protocolToken,
      underlyingToken,
      eventResults,
    })
  }

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const { protocolToken, underlyingToken } =
      this.fetchProtocolTokenMetadata(protocolTokenAddress)

    const protocolTokenContract =
      this.protocolTokenContract(protocolTokenAddress)

    const filter = protocolTokenContract.filters.Transfer(
      ZERO_ADDRESS,
      userAddress,
    )

    const eventResults = await protocolTokenContract.queryFilter<TransferEvent>(
      filter,
      fromBlock,
      toBlock,
    )

    return await this.eventUtil({
      protocolToken,
      underlyingToken,
      eventResults,
    })
  }

  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return []
  }

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

  async getPricePerShare({
    protocolTokenAddress,
  }: GetPricesInput): Promise<ProtocolPricePerShareToken> {
    const { protocolToken, underlyingToken } =
      this.fetchProtocolTokenMetadata(protocolTokenAddress)

    const pricePerShareRaw = BigInt(1 * 10 ** protocolToken.decimals)

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
          pricePerShareRaw,
          pricePerShare,
        },
      ],
    }
  }

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

    const tokens = await Promise.all(
      protocolTokensBalances.map(async (protocolTokenBalance) => {
        const underlyingTokenMetadata =
          this.metadata[protocolTokenBalance.address]!.underlyingToken

        const underlyingTokenBalance = {
          ...underlyingTokenMetadata,
          balanceRaw: protocolTokenBalance.balanceRaw,
          balance: protocolTokenBalance.balance,
          type: TokenType.Underlying,
        }

        return {
          ...protocolTokenBalance,
          type: TokenType.Protocol,
          tokens: [underlyingTokenBalance],
        }
      }),
    )

    return tokens
  }

  async getApr(_input: GetAprInput): Promise<ProtocolAprToken> {
    return {
      address: '0xprotocolTokenAddress',
      decimals: 8,
      symbol: 'stUSD',
      aprDecimal: '0.1', // 10%
      name: 'stUSD',
    }
  }

  async getApy(_input: GetApyInput): Promise<ProtocolApyToken> {
    return {
      address: '0xprotocolTokenAddress',
      decimals: 8,
      symbol: 'stUSD',
      apyDecimal: '0.1', // 10%
      name: 'stUSD',
    }
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTotalValueLockedToken[]> {
    return [
      {
        address: '0xprotocolTokenAddress',
        name: 'Coin-LP',
        symbol: 'S*USDC',
        decimals: 6,
        totalSupplyRaw: 31468548033n,
        totalSupply: '31468.548033',
        type: 'protocol',
        tokens: [
          {
            address: '0xunderlyingTokenAddress',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            totalSupply: '31492.408006',
            totalSupplyRaw: 31492408006n,
            type: 'underlying',
          },
        ],
      },
    ]
  }

  private eventUtil({
    protocolToken,
    underlyingToken,
    eventResults,
  }: {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
    eventResults: TransferEvent[]
  }): Promise<MovementsByBlock[]> {
    return Promise.all(
      eventResults.map(async (transferEvent) => {
        const {
          blockNumber,
          args: { value },
        } = transferEvent

        const protocolTokenPrice = await this.getPricePerShare({
          blockNumber,
          protocolTokenAddress: protocolToken.address,
        })

        const pricePerShareRaw =
          protocolTokenPrice.tokens?.[0]?.pricePerShareRaw
        if (!pricePerShareRaw) {
          throw new Error('No price for events at this time')
        }

        const movementValueRaw = BigInt(value.toString()) * pricePerShareRaw
        return {
          underlyingTokensMovement: {
            [underlyingToken.address]: {
              ...underlyingToken,
              movementValue: formatUnits(
                movementValueRaw,
                underlyingToken.decimals,
              ),
              movementValueRaw,
            },
          },
          blockNumber,
        }
      }),
    )
  }

  private fetchProtocolTokenMetadata(protocolTokenAddress: string) {
    const protocolTokenMetadata = this.metadata[protocolTokenAddress]

    if (!protocolTokenMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token not found')
      throw new Error('Protocol token not found')
    }

    return protocolTokenMetadata
  }

  private protocolTokenContract(address: string) {
    return Erc20__factory.connect(address, this.provider)
  }
}
