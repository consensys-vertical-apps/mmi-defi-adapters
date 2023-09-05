import { Chain } from '../../../../core/constants/chains'
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
  GetAprInput,
  GetApyInput,
  ProtocolAprToken,
  ProtocolApyToken,
} from '../../../../types/adapter'
import { ethers } from 'ethers'
import { ERC20 } from '../../../../core/utils/getTokenMetadata'
import { Protocol } from '../../..'
import { AaveV2PoolMetadata } from '../../buildMetadata'
import { getBalances } from '../../../../core/utils/getBalances'

export class AaveV2StableDebtTokenPoolAdapter implements IProtocolAdapter {
  private metadata: AaveV2PoolMetadata
  private provider: ethers.providers.StaticJsonRpcProvider
  private chainId: Chain

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

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: Protocol.AaveV2,
      name: 'Aave v2 StableDebtToken',
      description: 'Aave v2 defi adapter for stable interest-accruing token',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Borrow,
      chainId: this.chainId,
    }
  }

  async getProtocolTokens(): Promise<ERC20[]> {
    return Object.values(this.metadata).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  async getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return []
  }

  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return []
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

  async getPricePerShare(
    _input: GetPricesInput,
  ): Promise<ProtocolPricePerShareToken> {
    return {
      name: 'Tether USD-LP',
      iconUrl: '',
      decimals: 6,
      symbol: 'S*USDT',
      address: '0xprotocolTokenAddress',
      share: 1,
      type: 'protocol',
      tokens: [],
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
}
