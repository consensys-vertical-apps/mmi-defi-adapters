import { formatUnits } from 'ethers/lib/utils'
import { Protocol } from '../../..'
import { StargateToken__factory } from '../../../../contracts'
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
  PositionType,
  ProtocolAprToken,
  ProtocolApyToken,
  ProtocolDetails,
  ProtocolTotalValueLockedToken,
  TokenBalance,
  TokenType,
} from '../../../../types/adapter'
import { StargatePoolMetadata } from '../../buildMetadata'

export class StargatePoolAdapter extends SimplePoolAdapter<StargatePoolMetadata> {
  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: Protocol.Stargate,
      name: 'Stargate',
      description:
        'Stargate is a fully composable liquidity transport protocol that lives at the heart of Omnichain DeFi',
      siteUrl: 'https://stargate.finance/',
      iconUrl: 'https://stargate.finance/favicons/favicon-light.svg',
      positionType: PositionType.Supply,
      chainId: this.chainId,
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(this.metadata).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTotalValueLockedToken[]> {
    throw new Error('Not implemented')
  }

  async getClaimedRewards(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new Error('Not implemented')
  }

  async getApr(_input: GetAprInput): Promise<ProtocolAprToken> {
    throw new Error('Not implemented')
  }

  async getApy(_input: GetApyInput): Promise<ProtocolApyToken> {
    throw new Error('Not implemented')
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

    const amountLPtoLD = await this.stargateTokenContract(
      protocolTokenBalance.address,
    ).amountLPtoLD(protocolTokenBalance.balanceRaw)

    const underlyingTokenBalance = {
      ...underlyingTokenMetadata,
      balanceRaw: BigInt(amountLPtoLD.toString()),
      balance: formatUnits(amountLPtoLD, underlyingTokenMetadata.decimals),
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async getUnderlyingTokenPricesPerShare(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<BasePricePerShareToken[]> {
    const underlyingTokenMetadata = this.fetchPoolMetadata(
      protocolTokenMetadata.address,
    ).underlyingToken

    const oneToken = BigInt(1 * 10 ** protocolTokenMetadata.decimals)

    const pricePerShareRaw = await this.stargateTokenContract(
      protocolTokenMetadata.address,
    ).amountLPtoLD(oneToken, {
      blockTag: blockNumber,
    })

    const pricePerShare = formatUnits(
      pricePerShareRaw,
      underlyingTokenMetadata.decimals,
    )

    return [
      {
        ...underlyingTokenMetadata,
        type: TokenType.Underlying,
        pricePerShareRaw: BigInt(pricePerShareRaw.toString()),
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

  private stargateTokenContract(address: string) {
    return StargateToken__factory.connect(address, this.provider)
  }
}
