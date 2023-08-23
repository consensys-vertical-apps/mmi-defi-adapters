import { Chain } from '../../../../core/constants/chains'
import { Protocol } from '../../../../core/constants/protocols'
import {
  GetEventsInput,
  GetPositionsInput,
  GetPricesInput,
  GetProfitsInput,
  GetTotalValueLockInput,
  IProtocolAdapter,
  DefiProfitsResponse,
  ProtocolDetails,
  TradeEvent,
  PositionType,
  TokenType,
} from '../../../../types/adapter'
import { ethers } from 'ethers'
import {
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockToken,
} from '../../../../types/response'

export class ExampleAdapter implements IProtocolAdapter {
  private metadata: any
  private provider: ethers.providers.StaticJsonRpcProvider
  private chainId: Chain

  constructor({
    metadata,
    provider,
    chainId,
  }: {
    metadata: any
    provider: ethers.providers.StaticJsonRpcProvider
    chainId: Chain
  }) {
    this.metadata = metadata
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

  async getWithdrawals({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<TradeEvent[]> {
    console.log({ userAddress, protocolTokenAddress, fromBlock, toBlock })
    return [
      {
        trades: { '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 101 },
        protocolTokenAddress: '0x892785f33cdee22a30aef750f285e18c18040c3e',
        blockNumber: 17970876,
      },
    ]
  }

  async getDeposits({
    userAddress,
    protocolTokenAddress,
    fromBlock,
    toBlock,
  }: GetEventsInput): Promise<TradeEvent[]> {
    console.log({
      userAddress,
      protocolTokenAddress,
      fromBlock,
      toBlock,
    })
    return [
      {
        trades: { '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 100 },
        protocolTokenAddress: '0x892785f33cdee22a30aef750f285e18c18040c3e',
        blockNumber: 17970000,
      },
    ]
  }

  async getOneDayProfit({
    userAddress,
    blockNumber,
  }: GetProfitsInput): Promise<DefiProfitsResponse> {
    console.log({
      userAddress,
      blockNumber,
    })
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
              profit: 100,
            },
            {
              type: TokenType.Claimable,
              address: '0x17fc002b466eec40dae837fc4be5c67993ddbd6f',
              name: 'Frax',
              symbol: 'FRAX',
              decimals: 18,
              profit: 100,
            },
          ],
        },
      ],
    }
  }

  async getPricePerShare({
    blockNumber,
  }: GetPricesInput): Promise<ProtocolPricePerShareToken[]> {
    console.log({
      blockNumber,
    })
    return [
      {
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
            pricePerShare: 1.000154,
            decimals: 6,
            name: 'Tether USD',
            iconUrl: '',
            symbol: 'USDT',
            address: '0xunderlyingTokenAddress',
          },
        ],
      },
    ]
  }

  async getPositions({
    userAddress,
    blockNumber,
  }: GetPositionsInput): Promise<ProtocolToken[]> {
    console.log({
      userAddress,
      blockNumber,
    })
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
  async getTotalValueLock({
    blockNumber,
  }: GetTotalValueLockInput): Promise<ProtocolTotalValueLockToken[]> {
    console.log({ blockNumber })
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
