import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { ZERO_ADDRESS } from '../../../../core/constants/ZERO_ADDRESS'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import {
  PositionType,
  ProtocolDetails,
  TokenType,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { RocketTokenRETH__factory } from '../../../rocket-pool/contracts'

const PROTOCOL_TOKEN_ADDRESS = getAddress(
  '0xae78736Cd615f374D3085123A210448E74Fc6393',
)
export class RocketPoolRethAdapter extends SimplePoolAdapter {
  productId = 'reth'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: true,
    includeInUnwrap: true,
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'RocketPool',
      description: 'Rocket Pool rETH Adapter',
      siteUrl: 'https://rocketpool.net',
      iconUrl: 'https://rocketpool.net/files/reth-logo.svg',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  @CacheToDb()
  async getProtocolTokens() {
    return [
      {
        address: PROTOCOL_TOKEN_ADDRESS,
        name: 'Rocket Pool rETH',
        symbol: 'rETH',
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

    const rEthContract = RocketTokenRETH__factory.connect(
      protocolTokenMetadata.address,
      this.provider,
    )

    const underlyingRateRaw = await rEthContract.getExchangeRate({
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
