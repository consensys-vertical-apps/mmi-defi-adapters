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
import { ERC20 } from '../../../../core/utils/getTokenMetadata'

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
    protocolTokenAddress,
  }: GetPricesInput): Promise<ProtocolPricePerShareToken> {
    const protocolTokenAddresses = Object.keys(this.metadata)

    const underlyingToken = this.metadata[protocolTokenAddress].underlying
    const protocolToken = this.metadata[protocolTokenAddress].protocolToken

    const oneToken = BigInt(1 * 10 ** protocolToken.decimals)

    const pricePerShareRaw = await this.stargateTokenContract(
      protocolTokenAddress,
    ).amountLPtoLD(oneToken, {
      blockTag: blockNumber,
    })

    const pricePerShare = +formatUnits(
      pricePerShareRaw,
      underlyingToken.decimals,
    )

    const { name, iconUrl, decimals, symbol } =
      this.metadata[protocolTokenAddress]?.protocolToken || {}

    return {
      name,
      iconUrl: iconUrl ?? '',
      decimals,
      symbol,
      address: protocolToken.address,
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
  }: GetEventsInput): Promise<MovementsByBlock[]> {
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

      const protocolToken = this.metadata[key].protocolToken
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

  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
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
  }): Promise<MovementsByBlock[]> {
    return Promise.all(
      eventResults.map(async (transferEvent) => {
        const {
          blockNumber,
          args: { value },
        } = transferEvent

        const protocolTokenPrice = await this.getPricePerShare({
          blockNumber,
          protocolTokenAddress,
        })

        const { address, decimals } = metadata[protocolTokenAddress].underlying

        if (!protocolTokenPrice?.tokens?.[0]?.pricePerShare) {
          throw new Error('No price for events at this time')
        }

        return {
          movements: {
            [address]:
              +formatUnits(value, decimals) *
                protocolTokenPrice?.tokens?.[0]?.pricePerShare ?? 0,
          },
          blockNumber,
        }
      }),
    )
  }

  async getApr(_input: GetAprInput): Promise<ProtocolAprToken> {
    return {} as ProtocolAprToken
  }

  async getApy(_input: GetApyInput): Promise<ProtocolApyToken> {
    return {} as ProtocolApyToken
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
