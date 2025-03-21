import { Connection } from '@solana/web3.js'
import { getAddress } from 'ethers'
import { IMetadataProvider } from '../SQLiteMetadataProvider'
import { Erc20__factory } from '../contracts'
import { Chain, EvmChain } from '../core/constants/chains'
import { ProtocolTokenFilterRequiredError } from '../core/errors/errors'
import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../core/utils/filters'
import { getOnChainTokenMetadata } from '../core/utils/getTokenMetadata'
import { logger } from '../core/utils/logger'
import { nativeToken, nativeTokenAddresses } from '../core/utils/nativeTokens'
import {
  AdditionalMetadataWithReservedFields,
  ProtocolToken,
} from '../types/IProtocolAdapter'
import {
  GetPositionsInput,
  ProtocolPosition,
  TokenType,
  UnwrapExchangeRate,
} from '../types/adapter'
import { Erc20Metadata } from '../types/erc20Metadata'

const REAL_ESTATE_TOKEN_METADATA = {
  address: getAddress('0x6b8734ad31D42F5c05A86594314837C416ADA984'),
  name: 'Real Estate USD (REUSD)',
  symbol: 'Real Estate USD (REUSD)',
  decimals: 18,
}

export interface IHelpers {
  readonly metadataProvider: IMetadataProvider
}

export class SolanaHelpers {
  constructor(
    public readonly provider: Connection,
    public readonly metadataProvider: IMetadataProvider,
  ) {}
}

export class Helpers {
  constructor(
    public readonly provider: CustomJsonRpcProvider,
    public readonly chainId: EvmChain,
    public readonly metadataProvider: IMetadataProvider,
  ) {}

  getProtocolTokenByAddress<
    AdditionalMetadata extends AdditionalMetadataWithReservedFields,
  >({
    protocolTokens,
    protocolTokenAddress,
  }: {
    protocolTokens: ProtocolToken<AdditionalMetadata>[]
    protocolTokenAddress: string
  }): ProtocolToken<AdditionalMetadata> {
    const protocolToken = protocolTokens.find(
      (token) => token.address === protocolTokenAddress,
    )
    if (!protocolToken) {
      throw new Error(`Protocol token ${protocolTokenAddress} not found`)
    }
    return protocolToken
  }

  async getBalanceOfTokens({
    userAddress,
    protocolTokens,
    protocolTokenAddresses,
    blockNumber,
  }: GetPositionsInput & {
    protocolTokens: Erc20Metadata[]
  }): Promise<ProtocolPosition[]> {
    // Otherwise we might overload the node
    if (!protocolTokenAddresses && protocolTokens.length > 1000) {
      throw new ProtocolTokenFilterRequiredError()
    }

    return filterMapAsync(protocolTokens, async (protocolToken) => {
      if (
        protocolTokenAddresses &&
        !protocolTokenAddresses.includes(protocolToken.address)
      ) {
        return undefined
      }

      const tokenContract = Erc20__factory.connect(
        protocolToken.address,
        this.provider,
      )

      const balanceOf = await tokenContract
        .balanceOf(userAddress, {
          blockTag: blockNumber,
        })
        .catch(() => 0n) // contract might not be deployed at requested blockNumber

      if (balanceOf === 0n) {
        return undefined
      }

      return {
        address: protocolToken.address,
        name: protocolToken.name,
        symbol: protocolToken.symbol,
        decimals: protocolToken.decimals,
        balanceRaw: balanceOf,
        type: TokenType.Protocol,
      }
    })
  }

  /**
   * Unwraps the protocol token to its underlying token while accounting for decimal differences.
   *
   * This method resolves a 1:1 unwrap rate between the protocol token and it's underlying,
   * even though they have different decimal places. It uses the underlying token's decimals to adjust the unwrap rate.
   *
   * @returns {Promise<UnwrapExchangeRate>} A promise that resolves to an `UnwrapExchangeRate` object,
   * containing the details of the unwrapped tokens, including adjusted rates to account for decimal differences.
   *
   * @throws {Error} If there is an issue retrieving the protocol or underlying token information.
   */
  unwrapOneToOne({
    protocolToken,
    underlyingTokens,
  }: {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
  }): UnwrapExchangeRate {
    if (underlyingTokens.length !== 1) {
      throw new Error('Cannot map underlying token')
    }
    const underlyingToken = underlyingTokens[0]!

    // Always pegged one to one to underlying
    const pricePerShareRaw = BigInt(10 ** underlyingToken.decimals)

    return {
      address: protocolToken.address,
      name: protocolToken.name,
      symbol: protocolToken.symbol,
      decimals: protocolToken.decimals,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: [
        {
          ...underlyingToken,
          type: TokenType.Underlying,
          underlyingRateRaw: pricePerShareRaw,
        },
      ],
    }
  }

  async unwrapTokenAsRatio({
    protocolToken,
    underlyingTokens,
    blockNumber,
  }: {
    protocolToken: Erc20Metadata
    underlyingTokens: Erc20Metadata[]
    blockNumber?: number
  }): Promise<UnwrapExchangeRate> {
    if (underlyingTokens.length !== 1) {
      throw new Error('Missing Underlying tokens')
    }

    const protocolTokenContract = Erc20__factory.connect(
      protocolToken.address,
      this.provider,
    )

    const protocolTokenTotalSupply = await protocolTokenContract.totalSupply({
      blockTag: blockNumber,
    })

    const prices = await Promise.all(
      underlyingTokens.map(async (underlyingToken) => {
        const underlyingTokenContract = Erc20__factory.connect(
          underlyingToken.address,
          this.provider,
        )

        if (
          underlyingToken.address ===
          '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
        ) {
          const reserve = this.provider.getBalance(
            protocolToken.address,
            blockNumber,
          )
          return BigInt(
            Math.round(
              (Number(reserve) * 10 ** protocolToken.decimals) /
                Number(protocolTokenTotalSupply),
            ),
          )
        }

        const reserve = await underlyingTokenContract.balanceOf(
          protocolToken.address,
          {
            blockTag: blockNumber,
          },
        )

        // AssetReserve / ProtocolTokenSupply / 10 ** ProtocolTokenDecimals
        // Moved last division as multiplication at the top
        // Division sometimes is not exact, so it needs rounding
        return BigInt(
          Math.round(
            (Number(reserve) * 10 ** protocolToken.decimals) /
              Number(protocolTokenTotalSupply),
          ),
        )
      }),
    )

    return {
      address: protocolToken.address,
      name: protocolToken.name,
      symbol: protocolToken.symbol,
      decimals: protocolToken.decimals,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: prices.map((price, index) => {
        return {
          ...underlyingTokens[index]!,
          type: TokenType.Underlying,
          underlyingRateRaw: price,
        }
      }),
    }
  }
  async unwrapTokenWithRates({
    protocolToken,
    underlyingTokens,
    underlyingRates,
  }: {
    protocolToken: Erc20Metadata
    underlyingRates: bigint[]
    underlyingTokens: Erc20Metadata[]
  }): Promise<UnwrapExchangeRate> {
    if (underlyingTokens.length !== underlyingRates.length) {
      throw new Error('Underlying rate mismatch')
    }

    return {
      address: protocolToken.address,
      name: protocolToken.name,
      symbol: protocolToken.symbol,
      decimals: protocolToken.decimals,
      baseRate: 1,
      type: TokenType.Protocol,
      tokens: underlyingRates.map((price, index) => {
        return {
          ...underlyingTokens[index]!,
          type: TokenType.Underlying,
          underlyingRateRaw: price,
        }
      }),
    }
  }

  async getTokenMetadata(tokenAddress: string): Promise<Erc20Metadata> {
    if (
      getAddress(tokenAddress) === REAL_ESTATE_TOKEN_METADATA.address &&
      this.chainId === Chain.Ethereum
    ) {
      return REAL_ESTATE_TOKEN_METADATA
    }
    if (nativeTokenAddresses.includes(tokenAddress)) {
      return {
        address: getAddress(tokenAddress),
        ...nativeToken[this.chainId],
      }
    }

    const onChainTokenMetadata = await getOnChainTokenMetadata(
      tokenAddress,
      this.chainId,
      this.provider,
    )
    if (onChainTokenMetadata) {
      return onChainTokenMetadata
    }

    const errorMessage = 'Token metadata request failed'
    logger.error({ tokenAddress, chainId: this.chainId })
    throw new Error(errorMessage)
  }
}
