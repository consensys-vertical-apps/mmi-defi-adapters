import { getAddress, parseEther } from 'ethers'
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
import { OsEthController__factory } from '../../contracts/index.js'

const amount1 = parseEther('1')

const PROTOCOL_TOKEN_ADDRESS = getAddress(
  '0xf1C9acDc66974dFB6dEcB12aA385b9cD01190E38',
)
export class StakeWiseOsEthAdapter extends SimplePoolAdapter {
  productId = 'os-eth'

  adapterSettings: AdapterSettings = {
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  private async getVaultsRegistryAddress(): Promise<string> {
    const address = getAddress('0x3a0008a588772446f6e656133C2D5029CC4FC20E')

    return address
  }

  private async getOsEthControllerAddress(): Promise<string> {
    const address = getAddress('0x2A261e60FB14586B474C208b1B7AC6D0f5000306')

    return address
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      name: 'StakeWise',
      siteUrl: 'https://app.stakewise.io/',
      iconUrl: 'https://app.stakewise.io/osETH.svg',
      description: 'StakeWise DeFi Adapter for osETH',
      positionType: PositionType.Staked,
      protocolId: this.protocolId,
      productId: this.productId,
      chainId: this.chainId,
    }
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    const [protocolToken, underlyingToken] = await Promise.all([
      this.helpers.getTokenMetadata(PROTOCOL_TOKEN_ADDRESS),
      this.helpers.getTokenMetadata(ZERO_ADDRESS),
    ])

    return [
      {
        ...protocolToken,
        underlyingTokens: [underlyingToken],
      },
    ]
  }

  protected async unwrapProtocolToken(
    _: Erc20Metadata,
    blockNumber?: number,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const osEthControllerAddress = await this.getOsEthControllerAddress()

    const osEthControllerContract = OsEthController__factory.connect(
      osEthControllerAddress,
      this.provider,
    )

    const underlyingRateRaw = await osEthControllerContract.convertToAssets(
      amount1,
      { blockTag: blockNumber },
    )

    const underlyingTokens = await this.fetchUnderlyingTokensMetadata(
      PROTOCOL_TOKEN_ADDRESS,
    )

    return [
      {
        ...underlyingTokens[0]!,
        type: TokenType.Underlying,
        underlyingRateRaw,
      },
    ]
  }
}
