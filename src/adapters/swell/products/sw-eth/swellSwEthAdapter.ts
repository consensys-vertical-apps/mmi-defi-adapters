import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { NotImplementedError } from '../../../../core/errors/errors'
import {
  ProtocolDetails,
  PositionType,
  GetAprInput,
  GetApyInput,
  TokenBalance,
  TokenType,
  ProtocolTokenApr,
  ProtocolTokenApy,
  UnderlyingTokenRate,
  Underlying,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { SwEth__factory } from '../../contracts'

export class SwellSwEthAdapter extends SimplePoolAdapter {
  productId = 'sw-eth'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Swell swETH',
      description: 'Swell pool adapter',
      siteUrl: 'https://app.swellnetwork.io/',
      iconUrl: 'https://app.swellnetwork.io/logo.svg',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return [await this.fetchProtocolTokenMetadata()]
  }

  async getApy(_input: GetApyInput): Promise<ProtocolTokenApy> {
    throw new NotImplementedError()
  }

  async getApr(_input: GetAprInput): Promise<ProtocolTokenApr> {
    throw new NotImplementedError()
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()
    const [underlyingTokenRate] = await this.getUnderlyingTokenConversionRate({
      address: underlyingToken!.address,
      name: underlyingToken!.name,
      symbol: underlyingToken!.symbol,
      decimals: underlyingToken!.decimals,
    })

    const underlyingTokenBalanceRaw =
      (protocolTokenBalance.balanceRaw *
        underlyingTokenRate!.underlyingRateRaw) /
      10n ** BigInt(protocolTokenBalance.decimals)

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        balanceRaw: underlyingTokenBalanceRaw,
      },
    ]
  }

  protected async fetchProtocolTokenMetadata(): Promise<Erc20Metadata> {
    return {
      address: '0xf951E335afb289353dc249e82926178EaC7DEd78',
      name: 'Swell Ethereum',
      symbol: 'SWETH',
      decimals: 18,
    }
  }

  protected async getUnderlyingTokenConversionRate(
    _protocolTokenMetadata: Erc20Metadata,
  ): Promise<UnderlyingTokenRate[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()

    const swEthContract = SwEth__factory.connect(
      _protocolTokenMetadata.address,
      this.provider,
    )

    const underlyingRateRaw = await swEthContract.getRate()

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        underlyingRateRaw,
      },
    ]
  }

  protected async fetchUnderlyingTokensMetadata(): Promise<Erc20Metadata[]> {
    return [
      {
        address: ZERO_ADDRESS,
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      },
    ]
  }
}
