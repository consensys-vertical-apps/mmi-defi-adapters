import { pascalCase } from '../../core/utils/caseConversion'

export function simplePoolAdapterTemplate(
  protocolName: string,
  adapterName: string,
) {
  return `
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Adapter } from '../../../../core/decorators/adapter'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { Erc20Metadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import { IMetadataBuilder } from '../../../../core/utils/metadata'
import {
  BasePricePerShareToken,
  BaseToken,
  GetAprInput,
  GetApyInput,
  GetEventsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  PositionType,
  ProtocolAprToken,
  ProtocolApyToken,
  ProtocolDetails,
  ProtocolTotalValueLockedToken,
  TokenBalance,
  TokenType,
} from '../../../../types/adapter'

type ${pascalCase(adapterName)}Metadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
  }
>

@Adapter
export class ${pascalCase(adapterName)}
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  product!: string

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: '${protocolName}',
      description: '${protocolName} pool adapter',
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
    } as ${pascalCase(adapterName)}Metadata
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  protected async getUnderlyingTokens(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingTokens } = await this.fetchPoolMetadata(protocolTokenAddress)

    return underlyingTokens
  }

  protected async getUnderlyingTokenBalances(
    _protocolTokenBalance: TokenBalance,
  ): Promise<BaseToken[]> {
    return [
      {
        type: TokenType.Underlying,
        address: '0xunderlyingTokenAddress',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        balanceRaw: 31492408006n,
        balance: '31492.408006',
      },
    ]
  }

  protected async getUnderlyingTokenPricesPerShare(
    _protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<BasePricePerShareToken[]> {
    return [
      {
        type: TokenType.Underlying,
        address: '0xunderlyingTokenAddress',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        pricePerShareRaw: 1000154n,
        pricePerShare: '1.000154',
      },
    ]
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }
}
`
}
