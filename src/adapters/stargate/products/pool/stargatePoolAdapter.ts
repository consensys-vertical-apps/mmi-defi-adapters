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
  GetTotalValueLockInput,
  IProtocolAdapter,
  DefiProfitsResponse,
  ProtocolDetails,
  TradeEvent,
  PositionType,
  TokenType,
} from '../../../../types/adapter'
import {
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockToken,
} from '../../../../types/response'
import { StargatePoolMetadata } from '../../buildMetadata'

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

  async getOneDayProfit({
    userAddress,
    blockNumbers,
  }: GetProfitsInput): Promise<DefiProfitsResponse> {
    const toBlock =
      blockNumbers?.[this.chainId] ?? (await this.provider.getBlockNumber())
    const fromBlock = toBlock - AVERAGE_BLOCKS_PER_DAY[this.chainId]

    const [currentValues, previousValues] = await Promise.all([
      this.getPositions({
        userAddress,
        blockNumber: toBlock,
      }).then((result) => formatToMap(result)),

      this.getPositions({
        userAddress,
        blockNumber: fromBlock,
      }).then((result) => formatToMap(result)),
    ])

    const getProfitPerPosition = await Promise.all(
      Object.keys(currentValues).map(async (protocolTokenAddress) => {
        const [withdrawal, deposits] = await Promise.all([
          this.getWithdrawals({
            userAddress,
            protocolTokenAddress,
            fromBlock,
            toBlock,
          }).then((result) => aggregateTrades(result)),
          this.getDeposits({
            userAddress,
            protocolTokenAddress,
            fromBlock,
            toBlock,
          }).then((result) => aggregateTrades(result)),
        ])

        return {
          [protocolTokenAddress]: calculateProfit(
            deposits,
            withdrawal,
            currentValues[protocolTokenAddress],
            previousValues[protocolTokenAddress],
          ),
        }
      }),
    )

    const tokens = getProfitPerPosition.map((values) => {
      const [key, value] = Object.entries(values)[0]

      const protocolToken = this.metadata[key].lpToken
      const underlyingToken = this.metadata[key].underlying

      return {
        ...protocolToken,
        type: TokenType.Protocol,
        tokens: [
          {
            ...underlyingToken,
            profit: value[underlyingToken.address],
            type: TokenType.Underlying,
          },
        ],
      }
    })

    return { tokens, fromBlock, toBlock }
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

  async getPricePerShare({
    blockNumber,
  }: GetPricesInput): Promise<ProtocolPricePerShareToken[]> {
    const lpTokenAddresses = Object.keys(this.metadata)

    const tokens = await Promise.all(
      lpTokenAddresses.map(async (address) => {
        const underlyingToken = this.metadata[address].underlying
        const lpToken = this.metadata[address].lpToken

        const oneToken = BigInt(1 * 10 ** lpToken.decimals)

        const pricePerShareRaw = await this.stargateTokenContract(
          address,
        ).amountLPtoLD(oneToken, {
          blockTag: blockNumber,
        })

        const pricePerShare = +formatUnits(
          pricePerShareRaw,
          underlyingToken.decimals,
        )

        const { name, iconUrl, decimals, symbol } =
          this.metadata[address]?.lpToken || {}

        return {
          name,
          iconUrl: iconUrl ?? '',
          decimals,
          symbol,
          address: lpToken.address,
          share: 1,
          type: TokenType.Protocol,
          tokens: [
            {
              type: TokenType.Underlying,
              pricePerShare,
              decimals: underlyingToken.decimals,
              name: underlyingToken.name,
              iconUrl: iconUrl ?? '',
              symbol: underlyingToken.symbol,
              address: underlyingToken.address,
            },
          ],
        }
      }),
    )

    return tokens
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolToken[]> {
    const lpTokens = Object.values(this.metadata).map(({ lpToken }) => lpToken)

    const lpTokenBalances = await getBalances({
      chainId: this.chainId,
      provider: this.provider,
      userAddress,
      blockNumber,
      lpTokens,
    })

    const underlying = await Promise.all(
      lpTokenBalances.map(async (lpTokenBalance) => {
        const amountLPtoLD = await this.stargateTokenContract(
          lpTokenBalance.address,
        ).amountLPtoLD(lpTokenBalance.balanceRaw)

        const underlyingTokenMetadata =
          this.metadata[lpTokenBalance.address].underlying

        return {
          ...underlyingTokenMetadata,
          balanceRaw: BigInt(amountLPtoLD.toString()),
          balance: formatUnits(amountLPtoLD, underlyingTokenMetadata.decimals),
          type: TokenType.Underlying,
        }
      }),
    )

    const tokens = lpTokenBalances.map((lpTokenBalance, index) => {
      return {
        ...lpTokenBalance,
        type: TokenType.Protocol,
        tokens: [underlying[index]],
      }
    })

    return tokens
  }
  async getTotalValueLock(
    _input: GetTotalValueLockInput,
  ): Promise<ProtocolTotalValueLockToken[]> {
    // TODO
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
        const { decimals } = metadata[protocolTokenAddress].lpToken

        if (!tradeEventValue?.tokens?.[0]?.pricePerShare) {
          throw new Error('No price for events at this time')
        }

        return {
          trades: {
            [address]:
              +formatUnits(value, decimals) *
                tradeEventValue?.tokens?.[0]?.pricePerShare ?? 0,
          },
          protocolTokenAddress: metadata[protocolTokenAddress].lpToken.address,
          blockNumber,
        }
      }),
    )
  }

  private stargateTokenContract(address: string) {
    return StargateToken__factory.connect(address, this.provider)
  }
}
function formatToMap(tokens: ProtocolToken[]) {
  return tokens?.reduce(
    (acc, token) => {
      return {
        [token.address]:
          token?.tokens?.reduce(
            (acc, underlyingToken) => {
              return {
                [underlyingToken.address]: +underlyingToken.balance,
                ...acc,
              }
            },
            {} as Record<string, number>,
          ) || {},
        ...acc,
      }
    },
    {} as Record<string, Record<string, number>>,
  )
}
