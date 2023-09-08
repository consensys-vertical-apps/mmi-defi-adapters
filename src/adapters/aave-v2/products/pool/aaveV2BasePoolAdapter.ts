import { formatUnits } from 'ethers/lib/utils'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Erc20Metadata } from '../../../../core/utils/getTokenMetadata'
import { logger } from '../../../../core/utils/logger'
import {
  BasePricePerShareToken,
  BaseToken,
  GetAprInput,
  GetApyInput,
  GetEventsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  ProtocolAdapterParams,
  ProtocolAprToken,
  ProtocolApyToken,
  ProtocolTotalValueLockedToken,
  TokenBalance,
  TokenType,
} from '../../../../types/adapter'
import { AaveV2PoolMetadata } from '../../buildMetadata'

export abstract class AaveV2BasePoolAdapter extends SimplePoolAdapter {
  protected metadata: AaveV2PoolMetadata

  constructor({
    provider,
    chainId,
    metadata,
  }: ProtocolAdapterParams & { metadata: AaveV2PoolMetadata }) {
    super({ provider, chainId })
    this.metadata = metadata
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(this.metadata).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    return []
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

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const poolMetadata = this.fetchPoolMetadata(protocolTokenAddress)

    return poolMetadata.protocolToken
  }

  protected async getUnderlyingTokens(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const poolMetadata = this.fetchPoolMetadata(protocolTokenAddress)

    return [poolMetadata.underlyingToken]
  }

  protected async getUnderlyingTokenBalances(
    protocolTokenBalance: TokenBalance,
  ): Promise<BaseToken[]> {
    const underlyingTokenMetadata = this.fetchPoolMetadata(
      protocolTokenBalance.address,
    ).underlyingToken

    const underlyingTokenBalance = {
      ...underlyingTokenMetadata,
      balanceRaw: protocolTokenBalance.balanceRaw,
      balance: protocolTokenBalance.balance,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async getUnderlyingTokenPricesPerShare(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<BasePricePerShareToken[]> {
    const underlyingTokenMetadata = this.fetchPoolMetadata(
      protocolTokenMetadata.address,
    ).underlyingToken

    const pricePerShareRaw = BigInt(1 * 10 ** protocolTokenMetadata.decimals)

    const pricePerShare = formatUnits(
      pricePerShareRaw,
      underlyingTokenMetadata.decimals,
    )

    return [
      {
        ...underlyingTokenMetadata,
        type: TokenType.Underlying,
        pricePerShareRaw,
        pricePerShare,
      },
    ]
  }

  private fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = this.metadata[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error({ protocolTokenAddress }, 'Protocol token pool not found')
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }
}
