import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { CacheToFile } from '../../../../core/decorators/cacheToFile'
import { ProtocolToken } from '../../../../types/IProtocolAdapter'
import {
  AssetType,
  PositionType,
  ProtocolDetails,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { SwEth__factory } from '../../contracts'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'

type AdditionalMetadata = {
  underlyingTokens: Erc20Metadata[]
}

const PROTOCOL_TOKEN_ADDRESS = getAddress(
  '0xf951E335afb289353dc249e82926178EaC7DEd78',
)
export class SwellSwEthAdapter extends SimplePoolAdapter<AdditionalMetadata> {
  productId = 'sw-eth'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

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

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
    blockNumber,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata(
      PROTOCOL_TOKEN_ADDRESS,
    )
    const [unwrappedTokenExchangeRate] = await this.unwrapProtocolToken(
      protocolTokenBalance,
      blockNumber,
    )

    const underlyingTokenBalanceRaw =
      (protocolTokenBalance.balanceRaw *
        unwrappedTokenExchangeRate!.underlyingRateRaw) /
      10n ** BigInt(protocolTokenBalance.decimals)

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        balanceRaw: underlyingTokenBalanceRaw,
      },
    ]
  }

  @CacheToDb()
  async getProtocolTokens(): Promise<ProtocolToken<AdditionalMetadata>[]> {
    return [
      {
        address: PROTOCOL_TOKEN_ADDRESS,
        name: 'Swell Ethereum',
        symbol: 'SWETH',
        decimals: 18,
        underlyingTokens: [
          {
            address: ZERO_ADDRESS,
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
          },
        ],
      },
    ]
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata(
      PROTOCOL_TOKEN_ADDRESS,
    )

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
}
