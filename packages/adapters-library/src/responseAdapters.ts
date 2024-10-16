import { formatUnits } from 'ethers'
import { priceAdapterConfig } from './adapters/prices-v2/products/usd/priceV2Config.js'
import { USD } from './adapters/prices-v2/products/usd/pricesV2UsdAdapter.js'
import type { Chain } from './core/constants/chains.js'
import { buildTrustAssetIconUrl } from './core/utils/buildIconUrl.js'
import {
  type MovementsByBlock,
  type TokenBalance,
  type TokenTvl,
  TokenType,
  type Underlying,
  type UnderlyingTokenTvl,
  type UnwrapExchangeRate,
} from './types/adapter.js'
import type {
  DisplayMovementsByBlock,
  DisplayPosition,
  DisplayTokenTvl,
  DisplayUnwrapExchangeRate,
} from './types/response.js'

export function enrichPositionBalance<
  PositionBalance extends TokenBalance & {
    type: TokenType
    tokens?: Underlying[]
    priceRaw?: bigint
  },
>(balance: PositionBalance, chainId: Chain): DisplayPosition<PositionBalance> {
  return {
    ...balance,
    balance: +formatUnits(balance.balanceRaw, balance.decimals),
    price: balance.priceRaw
      ? +formatUnits(
          balance.priceRaw,
          priceAdapterConfig[chainId as keyof typeof priceAdapterConfig]
            .decimals,
        )
      : undefined,
    priceRaw: undefined,
    ...(balance.tokens
      ? {
          tokens: balance.tokens?.map((underlyingBalance) =>
            enrichPositionBalance(underlyingBalance, chainId),
          ),
        }
      : {}),
    ...(balance.type === TokenType.Underlying ||
    balance.type === TokenType.UnderlyingClaimable
      ? { iconUrl: buildTrustAssetIconUrl(chainId, balance.address) }
      : {}),
  } as DisplayPosition<PositionBalance>
}

export function enrichUnwrappedTokenExchangeRates(
  UnwrapExchangeRate: UnwrapExchangeRate,
  chainId: Chain,
): DisplayUnwrapExchangeRate {
  return {
    ...UnwrapExchangeRate,
    ...(UnwrapExchangeRate.tokens
      ? {
          tokens: UnwrapExchangeRate.tokens.map(
            (unwrappedTokenExchangeRate) => {
              return {
                ...unwrappedTokenExchangeRate,
                underlyingRate: +formatUnits(
                  unwrappedTokenExchangeRate.underlyingRateRaw,
                  unwrappedTokenExchangeRate.decimals,
                ),
                iconUrl:
                  unwrappedTokenExchangeRate.address !== USD
                    ? buildTrustAssetIconUrl(
                        chainId,
                        unwrappedTokenExchangeRate.address,
                      )
                    : undefined,
              }
            },
          ),
        }
      : {}),
  } as DisplayUnwrapExchangeRate
}

export function enrichMovements(
  movementsByBlock: MovementsByBlock,
  chainId: Chain,
): DisplayMovementsByBlock {
  return {
    ...movementsByBlock,

    tokens: movementsByBlock.tokens.reduce(
      (accumulator, token) => {
        return [
          ...accumulator,
          {
            ...token,
            price:
              token.priceRaw || token.priceRaw === 0n
                ? +formatUnits(
                    token.priceRaw,
                    priceAdapterConfig[
                      chainId as keyof typeof priceAdapterConfig
                    ].decimals,
                  )
                : undefined,
            priceRaw: undefined,
            balance: +formatUnits(token.balanceRaw, token.decimals),
            ...(token.tokens
              ? {
                  tokens: token.tokens?.map((underlyingBalance) =>
                    enrichPositionBalance(underlyingBalance, chainId),
                  ),
                }
              : {}),
          },
        ]
      },
      [] as (Underlying & { balance: number })[],
    ),
  }
}

export function enrichTotalValueLocked<
  TvlBalance extends TokenTvl & {
    type: TokenType
    tokens?: UnderlyingTokenTvl[]
    priceRaw?: bigint
  },
>(tokenTvl: TvlBalance, chainId: Chain): DisplayTokenTvl<TvlBalance> {
  return {
    ...tokenTvl,
    totalSupply: +formatUnits(tokenTvl.totalSupplyRaw, tokenTvl.decimals),
    price: tokenTvl.priceRaw
      ? +formatUnits(
          tokenTvl.priceRaw,
          priceAdapterConfig[chainId as keyof typeof priceAdapterConfig]
            .decimals,
        )
      : undefined,
    priceRaw: undefined,
    ...(tokenTvl.tokens
      ? {
          tokens: tokenTvl.tokens?.map((underlyingTokenTvl) =>
            enrichTotalValueLocked(underlyingTokenTvl, chainId),
          ),
        }
      : {}),
    ...(tokenTvl.type === TokenType.Underlying
      ? { iconUrl: buildTrustAssetIconUrl(chainId, tokenTvl.address) }
      : {}),
  } as DisplayTokenTvl<TvlBalance>
}
