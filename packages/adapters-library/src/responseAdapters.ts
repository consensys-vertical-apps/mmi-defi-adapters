import { formatUnits } from 'ethers'
import { priceAdapterConfig } from './adapters/prices-v2/products/usd/priceV2Config.js'
import { USD } from './adapters/prices-v2/products/usd/pricesV2UsdAdapter.js'
import type { Chain } from './core/constants/chains.js'
import { buildTrustAssetIconUrl } from './core/utils/buildIconUrl.js'
import {
  type TokenBalanceWithUnderlyings,
  TokenType,
  type UnwrapExchangeRate,
} from './types/adapter.js'
import type {
  DisplayPosition,
  DisplayUnwrapExchangeRate,
} from './types/response.js'

export function enrichPositionBalance<
  PositionBalance extends TokenBalanceWithUnderlyings & {
    type: TokenType
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
