import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import {
  AdapterSettings,
  PositionType,
  ProtocolDetails,
  TokenType,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'

/** Canonical NetNet Capital contracts on Robinhood Chain (docs.netnet.capital). */
const NET_TOKEN_ADDRESS = getAddress(
  '0xCA9c78Dd337A67F6e0077F65F5E9218719d30eDf',
)
const SNET_TOKEN_ADDRESS = getAddress(
  '0xb773ec2C326B7f98a5a83fc098825492F020a4c7',
)
const WSNET_TOKEN_ADDRESS = getAddress(
  '0x63C12667638f2Ae6fC6ae09B43D98Ec84a8586eA',
)

/**
 * NetNet Capital staked positions (sNET + wsNET) on Robinhood.
 * Tracks Transfer events for gating / position detection.
 */
export class NetnetCapitalStakedAdapter extends SimplePoolAdapter {
  productId = 'staked'

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'NetNet Capital',
      description: 'NetNet Capital staked NET positions on Robinhood Chain',
      siteUrl: 'https://netnet.capital',
      iconUrl: 'https://netnet.capital/favicon.ico',
      positionType: PositionType.Staked,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  /**
   * Returns sNET and wsNET protocol tokens with NET as underlying.
   */
  @CacheToDb
  async getProtocolTokens() {
    // Step 1: Robinhood-only deployment
    if (this.chainId !== Chain.Robinhood) {
      throw new Error('NetNet Capital adapter only supports Robinhood Chain')
    }

    // Step 2: Resolve on-chain metadata for protocol + underlying tokens
    const [sNetMetadata, wsNetMetadata, netMetadata] = await Promise.all([
      this.helpers.getTokenMetadata(SNET_TOKEN_ADDRESS),
      this.helpers.getTokenMetadata(WSNET_TOKEN_ADDRESS),
      this.helpers.getTokenMetadata(NET_TOKEN_ADDRESS),
    ])

    return [
      {
        ...sNetMetadata,
        underlyingTokens: [netMetadata],
      },
      {
        ...wsNetMetadata,
        underlyingTokens: [netMetadata],
      },
    ]
  }

  /**
   * 1:1 unwrap to NET (gating / balance detection; rate precision can improve later).
   */
  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata(
      protocolTokenMetadata.address,
    )

    // Step: Require underlying NET metadata for a 1:1 unwrap rate
    if (!underlyingToken) {
      throw new Error(
        `Missing underlying token for NetNet protocol token ${protocolTokenMetadata.address}`,
      )
    }

    const pricePerShareRaw = BigInt(10 ** underlyingToken.decimals)

    return [
      {
        ...underlyingToken,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }
}
