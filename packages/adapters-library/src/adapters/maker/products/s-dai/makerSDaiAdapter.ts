import { getAddress } from 'ethers'
import { SimplePoolAdapter } from '../../../../core/adapters/SimplePoolAdapter'
import { RAY_POSITIONS } from '../../../../core/constants/RAY'
import { NotImplementedError } from '../../../../core/errors/errors'
import {
  AssetType,
  GetTotalValueLockedInput,
  PositionType,
  ProtocolDetails,
  ProtocolTokenTvl,
  TokenBalance,
  TokenType,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { McdPot__factory } from '../../contracts'

const MCD_POT_ADDRESS = '0x197e90f9fad81970ba7976f33cbd77088e5d7cf7'

export class MakerSDaiAdapter extends SimplePoolAdapter {
  productId = 's-dai'

  adapterSettings = {
    enablePositionDetectionByProtocolTokenTransfer: false,
    includeInUnwrap: true,
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

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return [await this.fetchProtocolTokenMetadata()]
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
    blockNumber,
  }: {
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()

    const [underlyingTokenConversionRate] = await this.unwrapProtocolToken(
      protocolTokenBalance,
      blockNumber,
    )

    const daiBalance =
      (protocolTokenBalance.balanceRaw *
        underlyingTokenConversionRate!.underlyingRateRaw) /
      10n ** BigInt(underlyingTokenConversionRate!.decimals)

    return [
      {
        ...underlyingToken!,
        balanceRaw: daiBalance,
        type: TokenType.Underlying,
      },
    ]
  }

  async getTotalValueLocked(
    _input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]> {
    throw new NotImplementedError()
  }

  protected async fetchProtocolTokenMetadata(): Promise<Erc20Metadata> {
    return {
      address: getAddress('0x83f20f44975d03b1b09e64809b757c47f942beea'),
      name: 'Savings Dai',
      symbol: 'sDAI',
      decimals: 18,
    }
  }

  protected async fetchUnderlyingTokensMetadata(): Promise<Erc20Metadata[]> {
    return [
      {
        address: getAddress('0x6b175474e89094c44da98b954eedeac495271d0f'),
        name: 'Dai Stablecoin',
        symbol: 'DAI',
        decimals: 18,
      },
    ]
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const [underlyingToken] = await this.fetchUnderlyingTokensMetadata()

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
