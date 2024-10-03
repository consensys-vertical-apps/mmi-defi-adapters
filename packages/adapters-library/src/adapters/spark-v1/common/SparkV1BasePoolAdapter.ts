import { SimplePoolAdapter } from '../../../core/adapters/SimplePoolAdapter'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { Erc20Metadata } from '../../../types/erc20Metadata'

import {
  ProtocolDataProvider,
  ProtocolDataProvider__factory,
} from '../contracts'

import { ProtocolToken } from '../../../types/IProtocolAdapter'
import { TokenType, UnwrappedTokenExchangeRate } from '../../../types/adapter'

const PRICE_PEGGED_TO_ONE = 1
const sparkEthereumProviderAddress =
  '0xFc21d6d146E6086B8359705C8b28512a983db0cb'

export abstract class SparkV1BasePoolAdapter extends SimplePoolAdapter {
  async getProtocolTokens() {
    const protocolDataProviderContract = ProtocolDataProvider__factory.connect(
      sparkEthereumProviderAddress,
      this.provider,
    )

    const reserveTokens =
      await protocolDataProviderContract.getAllReservesTokens()

    const metadataObject: ProtocolToken[] = []

    const promises = reserveTokens.map(async ({ tokenAddress }) => {
      const reserveConfigurationData =
        await protocolDataProviderContract.getReserveConfigurationData(
          tokenAddress,
        )

      if (
        !reserveConfigurationData.isActive ||
        reserveConfigurationData.isFrozen
      ) {
        return
      }

      const reserveTokenAddresses =
        await protocolDataProviderContract.getReserveTokensAddresses(
          tokenAddress,
        )

      const protocolTokenPromise = getTokenMetadata(
        this.getReserveTokenAddress(reserveTokenAddresses),
        this.chainId,
        this.provider,
      )
      const underlyingTokenPromise = getTokenMetadata(
        tokenAddress,
        this.chainId,
        this.provider,
      )

      const [protocolToken, underlyingToken] = await Promise.all([
        protocolTokenPromise,
        underlyingTokenPromise,
      ])

      metadataObject.push({
        ...protocolToken,
        underlyingTokens: [underlyingToken],
      })
    })

    await Promise.all(promises)

    return metadataObject
  }

  protected abstract getReserveTokenAddress(
    reserveTokenAddresses: Awaited<
      ReturnType<ProtocolDataProvider['getReserveTokensAddresses']>
    >,
  ): string

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const underlyingTokens = await this.fetchUnderlyingTokensMetadata(
      protocolTokenMetadata.address,
    )

    // Aave tokens always pegged one to one to underlying
    const pricePerShareRaw = BigInt(
      PRICE_PEGGED_TO_ONE * 10 ** protocolTokenMetadata.decimals,
    )

    return [
      {
        ...underlyingTokens[0]!,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }
}
