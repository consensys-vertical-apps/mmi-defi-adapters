import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { ProtocolToken } from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  PositionType,
  ProtocolDetails,
  TokenType,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'

const PROTOCOL_TOKEN_ADDRESS = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'
export class LidoStEthAdapter extends SimplePoolAdapter {
  productId = 'st-eth'

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    return [
      {
        address: PROTOCOL_TOKEN_ADDRESS,
        name: 'Liquid staked Ether 2.0',
        symbol: 'stETH',
        decimals: 18,
        underlyingTokens: [
          {
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
          },
        ],
        metadata: {
          groupPositions: true,
        },
      },
    ]
  }

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
    }
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata(
      PROTOCOL_TOKEN_ADDRESS,
    )

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
