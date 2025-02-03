import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { RAY_POSITIONS } from '../../../../core/constants/RAY'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { ProtocolToken } from '../../../../types/IProtocolAdapter'
import {
  AdapterSettings,
  GetTotalValueLockedInput,
  PositionType,
  ProtocolDetails,
  ProtocolTokenTvl,
  TokenType,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { McdPot__factory } from '../../contracts'

const MCD_POT_ADDRESS = '0x197e90f9fad81970ba7976f33cbd77088e5d7cf7'

const PROTOCOL_TOKEN_ADDRESS = getAddress(
  '0x83f20f44975d03b1b09e64809b757c47f942beea',
)
export class MakerSDaiAdapter extends SimplePoolAdapter {
  productId = 's-dai'

  adapterSettings: AdapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: true,
    userEvent: 'Transfer',
  }

  getProtocolDetails(): ProtocolDetails {
    return {
      protocolId: this.protocolId,
      name: 'Maker',
      description: 'Maker sDAI adapter',
      siteUrl: 'https:',
      iconUrl: 'https://',
      positionType: PositionType.Supply,
      chainId: this.chainId,
      productId: this.productId,
    }
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  @CacheToDb
  async getProtocolTokens(): Promise<ProtocolToken[]> {
    return [
      {
        address: PROTOCOL_TOKEN_ADDRESS,
        name: 'Savings Dai',
        symbol: 'sDAI',
        decimals: 18,
        underlyingTokens: [
          {
            address: getAddress('0x6b175474e89094c44da98b954eedeac495271d0f'),
            name: 'Dai Stablecoin',
            symbol: 'DAI',
            decimals: 18,
          },
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

    const mcdPotContract = McdPot__factory.connect(
      MCD_POT_ADDRESS,
      this.provider,
    )

    const conversionRate = await mcdPotContract.chi({
      blockTag: blockNumber,
    })

    // The conversion rate is given with 27 decimal places (RAY)
    // The conversion rate we provide uses underlying token decimals
    // We need to subtract underlying decimal places to 27
    const pricePerShareRaw =
      conversionRate / 10n ** BigInt(RAY_POSITIONS - underlyingToken!.decimals)

    return [
      {
        ...underlyingToken!,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }
}
