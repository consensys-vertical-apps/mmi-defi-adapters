import { getAddress } from 'ethers'

import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import {
  AdapterSettings,
  PositionType,
  ProtocolDetails,
  TokenType,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'

import { Wusdm__factory } from '../../contracts'

const PROTOCOL_TOKEN_ADDRESS = getAddress(
  '0x57F5E098CaD7A3D1Eed53991D4d66C45C9AF7812',
)

const USDM_TOKEN_ADDRESS = getAddress(
  '0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C',
)

export class MountainProtocolWUsdmAdapter extends SimplePoolAdapter {
  productId = 'wusdm'

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Mountain Protocol wUSDM',
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
            USDM_TOKEN_ADDRESS,
            this.chainId,
            this.provider,
          ),
        ],
      },
    ]
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata(
      PROTOCOL_TOKEN_ADDRESS,
    )

    const wUSDMContract = Wusdm__factory.connect(
      protocolTokenMetadata.address,
      this.provider,
    )

    const pricePerShareRaw = await wUSDMContract.convertToAssets(
      BigInt(10 ** protocolTokenMetadata.decimals),
      {
        blockTag: blockNumber,
      },
    )

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }
}
