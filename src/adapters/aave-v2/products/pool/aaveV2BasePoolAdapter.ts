import { ethers } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { Erc20__factory } from '../../../../contracts'
import { TransferEvent } from '../../../../contracts/Erc20'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { Chain } from '../../../../core/constants/chains'
import { getBalances } from '../../../../core/utils/getBalances'
import { ERC20 } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
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

  async getProtocolTokens(): Promise<ERC20[]> {
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

  async getOneDayProfit(
    _input: GetProfitsInput,
  ): Promise<ProfitsTokensWithRange> {
    return {
      fromBlock: 0,
      toBlock: 0,
      tokens: [],
    }
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

  private protocolTokenContract(address: string) {
    return Erc20__factory.connect(address, this.provider)
  }
}
