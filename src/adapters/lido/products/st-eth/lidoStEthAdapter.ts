import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { NotImplementedError } from '../../../../core/errors/errors'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
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
  AssetType,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'

export class LidoStEthAdapter extends SimplePoolAdapter {
  productId = 'st-eth'

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Lido stEth',
      description: 'Lido defi adapter for stEth',
      siteUrl: 'https://stake.lido.fi/',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84/logo.png',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
      assetDetails: {
        type: AssetType.StandardErc20,
      },
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
    const stEthAddress = getAddress(
      '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    )
    return await getTokenMetadata(stEthAddress, this.chainId, this.provider)
  }
  protected async fetchUnderlyingTokensMetadata(): Promise<Erc20Metadata[]> {
    return [await getTokenMetadata(ZERO_ADDRESS, this.chainId, this.provider)]
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()

    const underlyingTokenBalance = {
      ...underlyingToken!,
      balanceRaw: protocolTokenBalance.balanceRaw,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
  ): Promise<UnderlyingTokenRate[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()

    // Always pegged one to one to underlying
    const pricePerShareRaw = BigInt(10 ** protocolTokenMetadata.decimals)

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }
}
