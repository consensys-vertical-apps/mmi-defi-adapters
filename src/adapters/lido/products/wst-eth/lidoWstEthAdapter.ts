import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { NotImplementedError } from '../../../../core/errors/errors'
import {
  ProtocolDetails,
  PositionType,
  GetApyInput,
  GetAprInput,
  ProtocolTokenApr,
  ProtocolTokenApy,
  TokenType,
  TokenBalance,
  Underlying,
  UnderlyingTokenRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { WstEthToken__factory } from '../../contracts'

export class LidoWstEthAdapter extends SimplePoolAdapter {
  productId = 'wst-eth'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Lido wstEth',
      description: 'Lido defi adapter for wstEth',
      siteUrl: 'https://stake.lido.fi/wrap',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84/logo.png',
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

  protected async fetchProtocolTokenMetadata(): Promise<Erc20Metadata> {
    return {
      address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
      name: 'Wrapped liquid staked Ether 2.0',
      symbol: 'WSTETH',
      decimals: 18,
    }
  }

  protected async fetchUnderlyingTokensMetadata(): Promise<Erc20Metadata[]> {
    return [
      {
        address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
        name: 'Liquid staked Ether 2.0',
        symbol: 'STETH',
        decimals: 18,
      },
    ]
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
    blockNumber,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()

    const wstEthContract = WstEthToken__factory.connect(
      protocolTokenBalance.address,
      this.provider,
    )

    const stEthBalance = await wstEthContract.getStETHByWstETH(
      protocolTokenBalance.balanceRaw,
      {
        blockTag: blockNumber,
      },
    )

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        balanceRaw: stEthBalance,
      },
    ]
  }

  protected async getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnderlyingTokenRate[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()

    const wstEthContract = WstEthToken__factory.connect(
      protocolTokenMetadata.address,
      this.provider,
    )

    const pricePerShareRaw = await wstEthContract.stEthPerToken({
      blockTag: blockNumber,
    })

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }
}
