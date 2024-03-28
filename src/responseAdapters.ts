import { formatUnits } from 'ethers'
import { USD } from './adapters/prices-v2/products/usd/pricesV2UsdAdapter'
import { priceAdapterConfig } from './adapters/prices-v2/products/usd/priceV2Config'
import { Chain } from './core/constants/chains'
import { buildTrustAssetIconUrl } from './core/utils/buildIconUrl'
import {
  MovementsByBlock,
  ProtocolTokenTvl,
  UnwrapExchangeRate,
  TokenBalance,
  Underlying,
  TokenType,
  TokenTvl,
  UnderlyingTokenTvl,
} from './types/adapter'
import {
  DisplayMovementsByBlock,
  DisplayPosition,
  DisplayProtocolTokenTvl,
  DisplayTokenTvl,
  DisplayUnwrapExchangeRate,
} from './types/response'

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

export function enrichUnderlyingTokenRates(
  UnwrapExchangeRate: UnwrapExchangeRate,
  chainId: Chain,
): DisplayUnwrapExchangeRate {
  return {
    ...UnwrapExchangeRate,
    ...(UnwrapExchangeRate.tokens
      ? {
          tokens: UnwrapExchangeRate.tokens.map((underlyingTokenRate) => {
            return {
              ...underlyingTokenRate,
              underlyingRate: +formatUnits(
                underlyingTokenRate.underlyingRateRaw,
                underlyingTokenRate.decimals,
              ),
              iconUrl:
                underlyingTokenRate.address != USD
                  ? buildTrustAssetIconUrl(chainId, underlyingTokenRate.address)
                  : undefined,
            }
          }),
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
