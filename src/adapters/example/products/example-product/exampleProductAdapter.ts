import { AdaptersController } from '../../../../core/adaptersController'
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
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { IProtocolAdapter } from '../../../../types/IProtocolAdapter'
import { Protocol } from '../../../protocols'

export class ExampleProductAdapter implements IProtocolAdapter {
  protocolId: Protocol
  chainId: Chain

  productId = 'example-pool'

  adaptersController: AdaptersController

  private provider: CustomJsonRpcProvider

  constructor({
    provider,
    chainId,
    protocolId,
    adaptersController,
  }: ProtocolAdapterParams) {
    this.provider = provider
    this.chainId = chainId
    this.protocolId = protocolId
    this.adaptersController = adaptersController
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
      productId: this.productId,
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
        transactionHash: '0x333',
        protocolToken: {
          address: '0x1000000000000000000000000000000000000001',
          name: 'LP USD Coin',
          symbol: 'LP USDC',
          decimals: 6,
        },
        tokens: [
          {
            address: '0x0000000000000000000000000000000000000001',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            balanceRaw: 100000000n,
            type: TokenType.Underlying,
          },
        ],
        blockNumber: 17970000,
      },
    ]
  }

  async getDeposits(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return [
      {
        transactionHash: '0x33',
        protocolToken: {
          address: '0x1000000000000000000000000000000000000001',
          name: 'LP USD Coin',
          symbol: 'LP USDC',
          decimals: 6,
        },
        tokens: [
          {
            address: '0x0000000000000000000000000000000000000001',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            balanceRaw: 100000000n,
            type: TokenType.Underlying,
          },
        ],
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
          profit: '100000000',
          calculationData: {
            withdrawals: '1',
            deposits: '1',
            startPositionValue: '1',
            endPositionValue: '1',
          },
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
