import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter.js'
import { Chain } from '../../../../core/constants/chains.js'
import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata.js'
import {
  type AdapterSettings,
  PositionType,
  type ProtocolDetails,
  TokenType,
  type UnwrappedTokenExchangeRate,
} from '../../../../types/adapter.js'

const PROTOCOL_TOKEN_ADDRESS = getAddress(
  '0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C',
)
export class MountainProtocolUsdmAdapter extends SimplePoolAdapter {
  productId = 'usdm'

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Mountain Protocol USDM',
      description: 'MountainProtocol defi adapter',
      siteUrl: 'https://mountainprotocol.com/',
      iconUrl: 'https://mountainprotocol.com/favicon.svg',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb
  async getProtocolTokens() {
    return [
      {
        ...(await getTokenMetadata(
          PROTOCOL_TOKEN_ADDRESS,
          this.chainId,
          this.provider,
        )),
        underlyingTokens: [
          await getTokenMetadata(
            getAddress(this.getUSDCAddress()),
            this.chainId,
            this.provider,
          ),
        ],
      },
    ]
  }

  private getUSDCAddress(): string {
    switch (this.chainId) {
      case Chain.Ethereum:
        return '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      case Chain.Polygon:
        return '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
      case Chain.Base:
        return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      case Chain.Arbitrum:
        return '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
      case Chain.Optimism:
        return '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
      default:
        throw new Error('Chain not supported')
    }
  }

  protected async unwrapProtocolToken(): Promise<UnwrappedTokenExchangeRate[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata(
      PROTOCOL_TOKEN_ADDRESS,
    )

    const pricePerShareRaw = BigInt(10 ** underlyingToken!.decimals)

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }
}
