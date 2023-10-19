import { Chain } from '../../../../core/constants/chains'
import { CustomJsonRpcProvider } from '../../../../core/utils/customJsonRpcProvider'
import {
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

  product = 'example-pool'

  private provider: CustomJsonRpcProvider

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
      product: this.product,
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return [
      {
        address: '0x1000000000000000000000000000000000000001',
        name: 'Coin-LP',
        symbol: 'S*USDC',
        decimals: 6,
      },
    ]
  }

  async getWithdrawals(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return [
      {
        protocolToken: {
          address: '0x1000000000000000000000000000000000000001',
          name: 'LP USD Coin',
          symbol: 'LP USDC',
          decimals: 6,
        },
        underlyingTokensMovement: {
          '0x0000000000000000000000000000000000000001': {
            address: '0x0000000000000000000000000000000000000001',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            movementValueRaw: 100000000n,
          },
        },
        blockNumber: 17970000,
      },
    ]
  }

  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return [
      {
        protocolToken: {
          address: '0x1000000000000000000000000000000000000001',
          name: 'LP USD Coin',
          symbol: 'LP USDC',
          decimals: 6,
        },
        underlyingTokensMovement: {
          '0x0000000000000000000000000000000000000001': {
            address: '0x0000000000000000000000000000000000000001',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            movementValueRaw: 100000000n,
          },
        },
        blockNumber: 17970000,
      },
    ]
  }

  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return [
      {
        protocolToken: {
          address: '0x1000000000000000000000000000000000000001',
          name: 'LP USD Coin',
          symbol: 'LP USDC',
          decimals: 6,
        },
        underlyingTokensMovement: {
          '0x0000000000000000000000000000000000000001': {
            address: '0x0000000000000000000000000000000000000001',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            movementValueRaw: 100000000n,
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
              calculationData: {
                withdrawalsRaw: 0n,
                depositsRaw: 0n,
                startPositionValueRaw: 0n,
                endPositionValueRaw: 0n,
              },
            },
            {
              type: TokenType.Reward,
              address: '0x17fc002b466eec40dae837fc4be5c67993ddbd6f',
              name: 'Frax',
              symbol: 'FRAX',
              decimals: 6,
              profitRaw: 100000000n,
              calculationData: {
                withdrawalsRaw: 0n,
                depositsRaw: 0n,
                startPositionValueRaw: 0n,
                endPositionValueRaw: 0n,
              },
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
      address: '0x2000000000000000000000000000000000000002',
      baseRate: 1,
      type: 'protocol',
      tokens: [
        {
          type: 'underlying',
          underlyingRateRaw: 1000154n,
          decimals: 6,
          name: 'Tether USD',
          symbol: 'USDT',
          address: '0x0000000000000000000000000000000000000002',
        },
      ],
    }
  }

  async getPositions(_input: GetPositionsInput): Promise<ProtocolPosition[]> {
    return [
      {
        address: '0x1000000000000000000000000000000000000001',
        name: 'Coin-LP',
        symbol: 'S*USDC',
        decimals: 6,
        balanceRaw: 31468548033n,
        type: 'protocol',
        tokens: [
          {
            address: '0x0000000000000000000000000000000000000001',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            balanceRaw: 31492408006n,
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
        address: '0x1000000000000000000000000000000000000001',
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
      address: '0x1000000000000000000000000000000000000001',
      name: 'Coin-LP',
      symbol: 'S*USDC',
      decimals: 6,
      aprDecimal: 0.1, // 10%
    }
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    return {
      address: '0x1000000000000000000000000000000000000001',
      name: 'Coin-LP',
      symbol: 'S*USDC',
      decimals: 6,
      apyDecimal: 0.1, // 10%
    }
  }
  async getRewardApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    return {
      address: '0x1000000000000000000000000000000000000001',
      name: 'Coin-LP',
      symbol: 'S*USDC',
      decimals: 6,
      apyDecimal: 0.1, // 10%
    }
  }
  async getRewardApr(_input: GetApyInput): Promise<ProtocolTokenApr> {
    return {
      address: '0x1000000000000000000000000000000000000001',
      name: 'Coin-LP',
      symbol: 'S*USDC',
      decimals: 6,
      aprDecimal: 0.1, // 10%
    }
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    return [
      {
        address: '0x1000000000000000000000000000000000000001',
        name: 'Coin-LP',
        symbol: 'S*USDC',
        decimals: 6,
        totalSupplyRaw: 31468548033n,
        type: 'protocol',
        tokens: [
          {
            address: '0x0000000000000000000000000000000000000001',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            totalSupplyRaw: 31492408006n,
            type: 'underlying',
          },
        ],
      },
    ]
  }
}
