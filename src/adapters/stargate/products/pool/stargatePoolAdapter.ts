import { ethers } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { StargateToken__factory } from '../../../../contracts'
import { TransferEvent } from '../../../../contracts/Erc20'
import { AVERAGE_BLOCKS_PER_DAY } from '../../../../core/constants/AVERAGE_BLOCKS_PER_DAY'
import { Chain } from '../../../../core/constants/chains'
import { Protocol } from '../../../../core/constants/protocols'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { getBalances } from '../../../../core/utils/getBalances'
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
  MovementsByBlock,
  PositionType,
  TokenType,
  ProfitsTokensWithRange,
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockedToken,
  ProtocolAprToken,
  GetAprInput,
  GetApyInput,
  ProtocolApyToken,
} from '../../../../types/adapter'
import { StargatePoolMetadata } from '../../buildMetadata'
import { formatProtocolTokenArrayToMap } from '../../../../core/utils/protocolTokenToMap'
import { ERC20 } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'

export class StargatePoolAdapter implements IProtocolAdapter {
  private metadata: StargatePoolMetadata
  private provider: ethers.providers.StaticJsonRpcProvider
  private chainId: Chain
  private protocolTokens: ERC20[]

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
    this.protocolTokens = Object.values(this.metadata).map(
      ({ protocolToken }) => protocolToken,
    )
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

  async getProtocolTokens(): Promise<ERC20[]> {
    return this.protocolTokens
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
      tokens: this.protocolTokens,
    })

    const tokens = await Promise.all(
      protocolTokensBalances.map(async (protocolTokenBalance) => {
        const amountLPtoLD = await this.stargateTokenContract(
          protocolTokenBalance.address,
        ).amountLPtoLD(protocolTokenBalance.balanceRaw)

        const underlyingTokenMetadata =
          this.metadata[protocolTokenBalance.address]!.underlying

        const underlyingTokenBalance = {
          ...underlyingTokenMetadata,
          balanceRaw: BigInt(amountLPtoLD.toString()),
          balance: formatUnits(amountLPtoLD, underlyingTokenMetadata.decimals),
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

  async getPricePerShare({
    blockNumber,
    protocolTokenAddress,
  }: GetPricesInput): Promise<ProtocolPricePerShareToken> {
    const { protocolToken, underlying: underlyingToken } =
      this.fetchProtocolTokenMetadata(protocolTokenAddress)

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
  }: GetEventsInput): Promise<MovementsByBlock[]> {
    const { protocolToken, underlying: underlyingToken } =
      this.fetchProtocolTokenMetadata(protocolTokenAddress)

    const contractFilter = this.stargateTokenContract(
      protocolTokenAddress,
    ).filters.Transfer(userAddress, ZERO_ADDRESS)

    const eventResults = await this.stargateTokenContract(
      protocolTokenAddress,
    ).queryFilter<TransferEvent>(contractFilter, fromBlock, toBlock)

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
    const { protocolToken, underlying: underlyingToken } =
      this.fetchProtocolTokenMetadata(protocolTokenAddress)

    const contractFilter = this.stargateTokenContract(
      protocolTokenAddress,
    ).filters.Transfer(ZERO_ADDRESS, userAddress)

    const eventResults = await this.stargateTokenContract(
      protocolTokenAddress,
    ).queryFilter<TransferEvent>(contractFilter, fromBlock, toBlock)

    return await this.eventUtil({
      protocolToken,
      underlyingToken,
      eventResults,
    })
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

          const [withdrawal, deposits] = await Promise.all([
            this.getWithdrawals(getEventsInput).then(aggregateTrades),
            this.getDeposits(getEventsInput).then(aggregateTrades),
          ])

          const profits = calculateProfit(
            deposits,
            withdrawal,
            underlyingTokenPositions,
            previousValues[protocolTokenMetadata.address]
              ?.underlyingTokenPositions ?? {},
          )

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

  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return []
  }

  async getApr(_input: GetAprInput): Promise<ProtocolAprToken> {
    return {} as ProtocolAprToken
  }

  async getApy(_input: GetApyInput): Promise<ProtocolApyToken> {
    return {} as ProtocolApyToken
  }

  private eventUtil({
    protocolToken,
    underlyingToken,
    eventResults,
  }: {
    protocolToken: ERC20
    underlyingToken: ERC20
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

  private stargateTokenContract(address: string) {
    return StargateToken__factory.connect(address, this.provider)
  }
}
