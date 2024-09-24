import { SimplePoolAdapter } from '../../../core/adapters/SimplePoolAdapter'
import {
  CacheToFile,
  IMetadataBuilder,
} from '../../../core/decorators/cacheToFile'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { Erc20Metadata } from '../../../types/erc20Metadata'

import { logger } from '../../../core/utils/logger'
import {
  ProtocolDataProvider,
  ProtocolDataProvider__factory,
} from '../contracts'

import { ProtocolToken } from '../../../types/IProtocolAdapter'
import {
  TokenBalance,
  TokenType,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../../types/adapter'

const PRICE_PEGGED_TO_ONE = 1
const sparkEthereumProviderAddress =
  '0xFc21d6d146E6086B8359705C8b28512a983db0cb'

type AdditionalMetadata = {
  underlyingTokens: Erc20Metadata[]
}

export abstract class SparkV1BasePoolAdapter extends SimplePoolAdapter<AdditionalMetadata> {
  async getProtocolTokens() {
    const protocolDataProviderContract = ProtocolDataProvider__factory.connect(
      sparkEthereumProviderAddress,
      this.provider,
    )

    const reserveTokens =
      await protocolDataProviderContract.getAllReservesTokens()

    const metadataObject: ProtocolToken<AdditionalMetadata>[] = []

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

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const underlyingTokens = await this.fetchUnderlyingTokensMetadata(
      protocolTokenBalance.address,
    )

    const underlyingTokenBalance = {
      ...underlyingTokens[0]!,
      balanceRaw: protocolTokenBalance.balanceRaw,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

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
