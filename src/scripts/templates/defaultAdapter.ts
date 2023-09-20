export function defaultAdapterTemplate(
  protocolKey: string,
  adapterClassName: string,
) {
  return `
import { ethers } from 'ethers'
import { Protocol } from '../../..'
import { Chain } from '../../../../core/constants/chains'
import { Adapter } from '../../../../core/decorators/adapter'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { Erc20Metadata } from '../../../../core/utils/getTokenMetadata'
import { IMetadataBuilder } from '../../../../core/utils/metadata'
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
  ProtocolAdapterParams,
} from '../../../../types/adapter'

@Adapter
export class ${adapterClassName}
  implements IProtocolAdapter, IMetadataBuilder
{
  product!: string
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
      protocolId: this.protocolId,
      name: '${protocolKey}',
      description: '${protocolKey} defi adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
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
              profit: '100',
            },
            {
              type: TokenType.Claimable,
              address: '0x17fc002b466eec40dae837fc4be5c67993ddbd6f',
              name: 'Frax',
              symbol: 'FRAX',
              decimals: 18,
              profit: '100',
            },
          ],
        },
      ],
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

  async getApr(_input: GetAprInput): Promise<ProtocolAprToken> {
    return {
      address: '0xprotocolTokenAddress',
      decimals: 8,
      symbol: 'stUSD',
      aprDecimal: '0.1', // 10%
      name: 'stUSD',
    }
  }

  @CacheToFile({ fileKey: 'protocol-token' })
  async buildMetadata() {
    return {
      '0xprotocolTokenAddress': {
        protocolToken: {
          address: '0xprotocolTokenAddress',
          name: 'Coin-LP',
          symbol: 'S*USDC',
          decimals: 6,
        },
        underlyingTokens: [
          {
            address: '0xunderlyingTokenAddress',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
          },
        ],
      },
    }
  }
}
`
}
