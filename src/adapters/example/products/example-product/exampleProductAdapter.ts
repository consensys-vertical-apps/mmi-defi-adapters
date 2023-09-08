import { ethers } from 'ethers'
import { Protocol } from '../../..'
import { Chain } from '../../../../core/constants/chains'
import { Erc20Metadata } from '../../../../core/utils/getTokenMetadata'
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
  PositionType,
  ProfitsTokensWithRange,
  ProtocolAdapterParams,
  ProtocolAprToken,
  ProtocolApyToken,
  ProtocolDetails,
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockedToken,
  TokenType,
} from '../../../../types/adapter'
import { Json } from '../../../../types/json'

export class ExampleProductAdapter implements IProtocolAdapter {
  private metadata: Json
  private provider: ethers.providers.StaticJsonRpcProvider
  private chainId: Chain

  constructor({ provider, chainId }: ProtocolAdapterParams) {
    this.metadata = {}
    this.provider = provider
    this.chainId = chainId
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: Protocol.Example,
      name: 'Example',
      description: 'Example defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return [
      {
        address: '0xprotocolTokenAddress',
        name: 'Coin-LP',
        symbol: 'S*USDC',
        decimals: 6,
      },
    ]
  }

  async getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return [
      {
        underlyingTokensMovement: {
          '0xunderlyingTokenAddress': {
            address: '0xunderlyingTokenAddress',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            movementValueRaw: 100n,
            movementValue: '100',
          },
        },
        blockNumber: 17970000,
      },
    ]
  }

  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return [
      {
        underlyingTokensMovement: {
          '0xunderlyingTokenAddress': {
            address: '0xunderlyingTokenAddress',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            movementValueRaw: 100n,
            movementValue: '100',
          },
        },
        blockNumber: 17970000,
      },
    ]
  }

  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return [
      {
        underlyingTokensMovement: {
          '0xunderlyingTokenAddress': {
            address: '0xunderlyingTokenAddress',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            movementValueRaw: 100n,
            movementValue: '100',
          },
        },
        blockNumber: 17970000,
      },
    ]
  }

  async getOneDayProfit(
    _input: GetProfitsInput,
  ): Promise<ProfitsTokensWithRange> {
    return {
      fromBlock: 111,
      toBlock: 112,
      tokens: [
        {
          address: '0xaa4bf442f024820b2c28cd0fd72b82c63e66f56c',
          name: 'Frax-LP',
          symbol: 'S*FRAX',
          decimals: 6,
          type: TokenType.Protocol,
          tokens: [
            {
              type: TokenType.Underlying,
              address: '0x17fc002b466eec40dae837fc4be5c67993ddbd6f',
              name: 'Frax',
              symbol: 'FRAX',
              decimals: 18,
              profitRaw: 100n,
              profit: '100',
            },
            {
              type: TokenType.Claimable,
              address: '0x17fc002b466eec40dae837fc4be5c67993ddbd6f',
              name: 'Frax',
              symbol: 'FRAX',
              decimals: 18,
              profitRaw: 100n,
              profit: '100',
            },
          ],
        },
      ],
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
      tokens: [
        {
          type: 'underlying',
          pricePerShareRaw: 1000154n,
          pricePerShare: '1.000154',
          decimals: 6,
          name: 'Tether USD',
          iconUrl: '',
          symbol: 'USDT',
          address: '0xunderlyingTokenAddress',
        },
      ],
    }
  }

  async getPositions(_input: GetPositionsInput): Promise<ProtocolToken[]> {
    return [
      {
        address: '0xprotocolTokenAddress',
        name: 'Coin-LP',
        symbol: 'S*USDC',
        decimals: 6,
        balanceRaw: 31468548033n,
        balance: '31468.548033',
        type: 'protocol',
        tokens: [
          {
            address: '0xunderlyingTokenAddress',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            balanceRaw: 31492408006n,
            balance: '31492.408006',
            type: 'underlying',
          },
          {
            address: '0xrewardContractAddress',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            balanceRaw: 31492408006n,
            balance: '31492.408006',
            type: 'claimable',
            tokens: [
              {
                address: '0xunderlyingRewardTokenAddress',
                name: 'USD Coin',
                symbol: 'USDC',
                decimals: 6,
                balanceRaw: 31492408006n,
                balance: '31492.408006',
                type: 'underlying',
              },
            ],
          },
        ],
      },
    ]
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
