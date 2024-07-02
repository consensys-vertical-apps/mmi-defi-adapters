import { SimplePoolAdapter } from '../../../core/adapters/SimplePoolAdapter'
import { IMetadataBuilder } from '../../../core/decorators/cacheToFile'
import { getTokenMetadata } from '../../../core/utils/getTokenMetadata'
import { Erc20Metadata } from '../../../types/erc20Metadata'

import { logger } from '../../../core/utils/logger'
import {
  ProtocolDataProvider,
  ProtocolDataProvider__factory,
} from '../contracts'

import {
  TokenBalance,
  TokenType,
  Underlying,
  UnwrappedTokenExchangeRate,
} from '../../../types/adapter'

const PRICE_PEGGED_TO_ONE = 1
const sparkEthereumProviderAddress =
  '0xFc21d6d146E6086B8359705C8b28512a983db0cb'

export type SparkMetadata = Record<
  string,
  {
    protocolToken: Erc20Metadata
    underlyingToken: Erc20Metadata
  }
>

export abstract class SparkV1BasePoolAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  async buildMetadata(): Promise<SparkMetadata> {
    const protocolDataProviderContract = ProtocolDataProvider__factory.connect(
      sparkEthereumProviderAddress,
      this.provider,
    )

    const reserveTokens =
      await protocolDataProviderContract.getAllReservesTokens()

    const metadataObject: SparkMetadata = {}

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

      metadataObject[protocolToken.address] = {
        protocolToken,
        underlyingToken,
      }
    })

    await Promise.all(promises)

    return metadataObject
  }

  protected abstract getReserveTokenAddress(
    reserveTokenAddresses: Awaited<
      ReturnType<ProtocolDataProvider['getReserveTokensAddresses']>
    >,
  ): string

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  private async fetchPoolMetadata(protocolTokenAddress: string) {
    const poolMetadata = (await this.buildMetadata())[protocolTokenAddress]

    if (!poolMetadata) {
      logger.error(
        {
          protocolTokenAddress,
          protocol: this.protocolId,
          chainId: this.chainId,
          product: this.productId,
        },
        'Protocol token pool not found',
      )
      throw new Error('Protocol token pool not found')
    }

    return poolMetadata
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken } =
      await this.fetchPoolMetadata(protocolTokenAddress)

    return [underlyingToken]
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  protected async getUnderlyingTokenBalances({
    protocolTokenBalance,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenBalance.address,
    )

    const underlyingTokenBalance = {
      ...underlyingToken,
      balanceRaw: protocolTokenBalance.balanceRaw,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    _blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenMetadata.address,
    )

    // Aave tokens always pegged one to one to underlying
    const pricePerShareRaw = BigInt(
      PRICE_PEGGED_TO_ONE * 10 ** protocolTokenMetadata.decimals,
    )

    return [
      {
        ...underlyingToken,
        type: TokenType.Underlying,
        underlyingRateRaw: pricePerShareRaw,
      },
    ]
  }
}
