import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter.js'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS.js'
import { CacheToDb } from '../../../../core/decorators/cacheToDb.js'
import type { ProtocolToken } from '../../../../types/IProtocolAdapter.js'
import {
  type AdapterSettings,
  PositionType,
  type ProtocolDetails,
  TokenType,
  type UnwrappedTokenExchangeRate,
} from '../../../../types/adapter.js'
import type { Erc20Metadata } from '../../../../types/erc20Metadata.js'
import { SwEth__factory } from '../../contracts/index.js'

const PROTOCOL_TOKEN_ADDRESS = getAddress(
  '0xf951E335afb289353dc249e82926178EaC7DEd78',
)
export class SwellSwEthAdapter extends SimplePoolAdapter {
  productId = 'sw-eth'

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
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

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
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
