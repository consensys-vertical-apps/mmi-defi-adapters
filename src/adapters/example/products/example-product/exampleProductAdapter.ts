import { ethers } from 'ethers'
import { Chain } from '../../../../core/constants/chains'
import {
  CalculationData,
  GetAprInput,
  GetApyInput,
  GetEventsInput,
  GetPositionsInput,
  GetConversionRateInput,
  GetProfitsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProfitsWithRange,
  ProtocolAdapterParams,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolDetails,
  ProtocolTokenUnderlyingRate,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  ProtocolRewardPosition,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'

export class ExampleProductAdapter implements IProtocolAdapter {
  protocolId: Protocol
  chainId: Chain

  private provider: ethers.JsonRpcProvider

  constructor({ provider, chainId, protocolId }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
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

  async getProfits(_input: GetProfitsInput): Promise<ProfitsWithRange> {
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
              decimals: 6,
              profitRaw: 100000000n,
              calculationData: {} as CalculationData,
            },
            {
              type: TokenType.Reward,
              address: '0x17fc002b466eec40dae837fc4be5c67993ddbd6f',
              name: 'Frax',
              symbol: 'FRAX',
              decimals: 6,
              profitRaw: 100000000n,
              calculationData: {} as CalculationData,
            },
          ],
        },
      ],
    }
  }

  async getProtocolTokenToUnderlyingTokenRate(
    _input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate> {
    return {
      name: 'Tether USD-LP',

      decimals: 6,
      symbol: 'S*USDT',
      address: '0xprotocolTokenAddress',
      baseRate: 1,
      type: 'protocol',
      tokens: [
        {
          type: 'underlying',
          underlyingRateRaw: 1000154n,
          decimals: 6,
          name: 'Tether USD',
          iconUrl: '',
          symbol: 'USDT',
          address: '0xunderlyingTokenAddress',
        },
      ],
    }
  }

  async getPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return [
      {
        address: '0xprotocolTokenAddress',
        name: 'Coin-LP',
        symbol: 'S*USDC',
        decimals: 6,
        balanceRaw: 31468548033n,
        type: 'protocol',
        tokens: [
          {
            address: '0xunderlyingTokenAddress',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            balanceRaw: 31492408006n,
            iconUrl: '',
            type: 'underlying',
          },
        ],
      },
    ]
  }
  async getClaimableRewards(
    _input: GetPositionsInput,
  ): Promise<ProtocolRewardPosition[]> {
    return [
      {
        address: '0xprotocolTokenAddress',
        name: 'Coin-LP',
        symbol: 'S*USDC',
        decimals: 6,

        type: 'protocol',
        tokens: [
          {
            address: '0xrewardContractAddress',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            balanceRaw: 31492408006n,
            type: 'claimable',
            tokens: [
              {
                address: '0xunderlyingRewardTokenAddress',
                name: 'USD Coin',
                symbol: 'USDC',
                iconUrl: '',
                decimals: 6,
                balanceRaw: 31492408006n,
                type: 'underlying',
              },
            ],
          },
        ],
      },
    ]
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    return {
      address: '0xprotocolTokenAddress',
      decimals: 8,
      symbol: 'stUSD',
      aprDecimal: '0.1', // 10%
      name: 'stUSD',
    }
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    return {
      address: '0xprotocolTokenAddress',
      decimals: 8,
      symbol: 'stUSD',
      apyDecimal: '0.1', // 10%
      name: 'stUSD',
    }
  }
  async getRewardApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    return {
      address: '0xprotocolTokenAddress',
      decimals: 8,
      symbol: 'stUSD',
      apyDecimal: '0.1', // 10%
      name: 'stUSD',
    }
  }
  async getRewardApr(_input: GetApyInput): Promise<ProtocolTokenApr> {
    return {
      address: '0xprotocolTokenAddress',
      decimals: 8,
      symbol: 'stUSD',
      aprDecimal: '0.1', // 10%
      name: 'stUSD',
    }
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
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
