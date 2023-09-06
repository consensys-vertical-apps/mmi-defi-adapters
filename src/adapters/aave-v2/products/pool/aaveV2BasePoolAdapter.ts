import { ethers } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { Erc20__factory } from '../../../../contracts'
import { Chain } from '../../../../core/constants/chains'
import { getBalances } from '../../../../core/utils/getBalances'
import {
  getDeposits,
  getWithdrawals,
} from '../../../../core/utils/getMovements'
import { getOneDayProfit } from '../../../../core/utils/getOneDayProfit'
import { ERC20Metadata } from '../../../../core/utils/getTokenMetadata'
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

  async getProtocolTokens(): Promise<ERC20Metadata[]> {
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

    const protocolTokenContract = Erc20__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    return await getWithdrawals({
      userAddress,
      fromBlock,
      toBlock,
      protocolToken,
      underlyingTokens: [underlyingToken],
      protocolTokenContract,
      getPricePerShare: this.getPricePerShare.bind(this),
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

    const protocolTokenContract = Erc20__factory.connect(
      protocolTokenAddress,
      this.provider,
    )

    return await getDeposits({
      userAddress,
      fromBlock,
      toBlock,
      protocolToken,
      underlyingTokens: [underlyingToken],
      protocolTokenContract,
      getPricePerShare: this.getPricePerShare.bind(this),
    })
  }

  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return []
  }

  async getOneDayProfit(
    input: GetProfitsInput,
  ): Promise<ProfitsTokensWithRange> {
    return await getOneDayProfit({
      ...input,
      chainId: this.chainId,
      getPositions: this.getPositions.bind(this),
      getWithdrawals: this.getWithdrawals.bind(this),
      getDeposits: this.getDeposits.bind(this),
    })
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

  private fetchProtocolTokenMetadata(protocolTokenAddress: string) {
    const protocolTokenMetadata = this.metadata[protocolTokenAddress]

    if (!protocolTokenMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token not found')
      throw new Error('Protocol token not found')
    }

    return protocolTokenMetadata
  }
}
