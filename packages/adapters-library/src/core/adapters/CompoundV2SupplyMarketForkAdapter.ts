import { CompoundV2Cerc20__factory } from '../../contracts'
import {
  TokenBalance,
  Underlying,
  TokenType,
  UnwrappedTokenExchangeRate,
  GetEventsInput,
  MovementsByBlock,
} from '../../types/adapter'
import { Erc20Metadata } from '../../types/erc20Metadata'
import { Chain } from '../constants/chains'
import { IMetadataBuilder } from '../decorators/cacheToFile'
import { NotImplementedError } from '../errors/errors'
import { logger } from '../utils/logger'
import { buildMetadata } from './compoundV2BuildMetadata'
import { SimplePoolAdapter } from './SimplePoolAdapter'

export abstract class CompoundV2SupplyMarketForkAdapter
  extends SimplePoolAdapter
  implements IMetadataBuilder
{
  abstract contractAddresses: Partial<
    Record<Chain, { comptrollerAddress: string }>
  >

  async buildMetadata() {
    return await buildMetadata({
      chainId: this.chainId,
      provider: this.provider,
      contractAddresses: this.contractAddresses,
    })
  }

  async getProtocolTokens(): Promise<Erc20Metadata[]> {
    return Object.values(await this.buildMetadata()).map(
      ({ protocolToken }) => protocolToken,
    )
  }

  protected async fetchProtocolTokenMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata> {
    const { protocolToken } = await this.fetchPoolMetadata(protocolTokenAddress)

    return protocolToken
  }

  protected async fetchUnderlyingTokensMetadata(
    protocolTokenAddress: string,
  ): Promise<Erc20Metadata[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenAddress,
    )

    return [underlyingToken]
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

  protected async getUnderlyingTokenBalances({
    userAddress,
    protocolTokenBalance,
    blockNumber,
  }: {
    userAddress: string
    protocolTokenBalance: TokenBalance
    blockNumber?: number
  }): Promise<Underlying[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenBalance.address,
    )

    const poolContract = CompoundV2Cerc20__factory.connect(
      protocolTokenBalance.address,
      this.provider,
    )

    const underlyingBalance = await poolContract.balanceOfUnderlying.staticCall(
      userAddress,
      {
        blockTag: blockNumber,
      },
    )

    const underlyingTokenBalance = {
      ...underlyingToken,
      balanceRaw: underlyingBalance,
      type: TokenType.Underlying,
    }

    return [underlyingTokenBalance]
  }

  protected async unwrapProtocolToken(
    protocolTokenMetadata: Erc20Metadata,
    blockNumber?: number | undefined,
  ): Promise<UnwrappedTokenExchangeRate[]> {
    const { underlyingToken } = await this.fetchPoolMetadata(
      protocolTokenMetadata.address,
    )

    const poolContract = CompoundV2Cerc20__factory.connect(
      protocolTokenMetadata.address,
      this.provider,
    )

    const exchangeRateCurrent =
      await poolContract.exchangeRateCurrent.staticCall({
        blockTag: blockNumber,
      })

    // The current exchange rate is scaled by 1 * 10^(18 - 8 + Underlying Token Decimals).
    const adjustedExchangeRate = exchangeRateCurrent / 10n ** 10n

    return [
      {
        ...underlyingToken,
        type: TokenType.Underlying,
        underlyingRateRaw: adjustedExchangeRate,
      },
    ]
  }

  getBorrows(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }

  getRepays(_input: GetEventsInput): Promise<MovementsByBlock[]> {
    throw new NotImplementedError()
  }
}
