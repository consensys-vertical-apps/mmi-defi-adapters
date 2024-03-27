import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import {
  ProtocolDetails,
  PositionType,
  TokenBalance,
  TokenType,
  UnderlyingTokenRate,
  Underlying,
  AssetType,
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
      assetDetails: {
        type: AssetType.StandardErc20,
      },
    }
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return [await this.fetchProtocolTokenMetadata()]
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
    const [underlyingTokenRate] = await this.getUnderlyingTokenConversionRate(
      protocolTokenBalance,
      blockNumber,
    )

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
      address: getAddress('0xf951E335afb289353dc249e82926178EaC7DEd78'),
      name: 'Swell Ethereum',
      symbol: 'SWETH',
      decimals: 18,
    }
  }

  protected async getUnderlyingTokenConversionRate(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number,
  ): Promise<UnderlyingTokenRate[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()

    const swEthContract = SwEth__factory.connect(
      protocolTokenMetadata.address,
      this.provider,
    )

    const underlyingRateRaw = await swEthContract.getRate({
      blockTag: blockNumber,
    })

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
