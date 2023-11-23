import { formatUnits } from 'ethers'
import { Chain } from './core/constants/chains'
import { buildTrustAssetIconUrl } from './core/utils/buildIconUrl'
import {
  MovementsByBlock,
  BaseTokenMovement,
  ProtocolTokenTvl,
  ProtocolTokenUnderlyingRate,
  ProfitsWithRange,
  TokenBalance,
  Underlying,
  TokenType,
} from './types/adapter'
import {
  DisplayMovementsByBlock,
  DisplayPosition,
  DisplayProfitsWithRange,
  DisplayProtocolTokenTvl,
  DisplayProtocolTokenUnderlyingRate,
} from './types/response'

export function enrichPositionBalance<
  PositionBalance extends TokenBalance & {
    type: TokenType
    tokens?: Underlying[]
  },
>(balance: PositionBalance, chainId: Chain): DisplayPosition<PositionBalance> {
  return {
    ...balance,
    balance: formatUnits(balance.balanceRaw, balance.decimals),
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

export function enrichProfitsWithRange(
  profitsWithRange: ProfitsWithRange,
  chainId: Chain,
): DisplayProfitsWithRange {
  return {
    ...profitsWithRange,
    tokens: profitsWithRange.tokens?.map((positionProfit) => {
      return {
        ...positionProfit,
        tokens: positionProfit.tokens.map((underlyingProfitValue) => {
          return {
            ...underlyingProfitValue,
            profit: formatUnits(
              underlyingProfitValue.profitRaw,
              underlyingProfitValue.decimals,
            ),
            iconUrl: buildTrustAssetIconUrl(
              chainId,
              underlyingProfitValue.address,
            ),
            calculationData: {
              ...underlyingProfitValue.calculationData,
              withdrawals: formatUnits(
                underlyingProfitValue.calculationData.withdrawalsRaw ?? 0n,
                underlyingProfitValue.decimals,
              ),
              deposits: formatUnits(
                underlyingProfitValue.calculationData.depositsRaw ?? 0n,
                underlyingProfitValue.decimals,
              ),
              startPositionValue: formatUnits(
                underlyingProfitValue.calculationData.startPositionValueRaw ??
                0n,
                underlyingProfitValue.decimals,
              ),
              endPositionValue: formatUnits(
                underlyingProfitValue.calculationData.endPositionValueRaw ?? 0n,
                underlyingProfitValue.decimals,
              ),
            },
          }
        }),
      }
    }),
  }
}

export function enrichUnderlyingTokenRates(
  protocolTokenUnderlyingRate: ProtocolTokenUnderlyingRate,
  chainId: Chain,
): DisplayProtocolTokenUnderlyingRate {
  return {
    ...protocolTokenUnderlyingRate,
    ...(protocolTokenUnderlyingRate.tokens
      ? {
        tokens: protocolTokenUnderlyingRate.tokens.map(
          (underlyingTokenRate) => {
            return {
              ...underlyingTokenRate,
              underlyingRate: formatUnits(
                underlyingTokenRate.underlyingRateRaw,
                underlyingTokenRate.decimals,
              ),
              iconUrl: buildTrustAssetIconUrl(
                chainId,
                underlyingTokenRate.address,
              ),
            }
          },
        ),
      }
      : {}),
  } as DisplayProtocolTokenUnderlyingRate
}

export function enrichMovements(
  movementsByBlock: MovementsByBlock,
): DisplayMovementsByBlock {
  return {
    ...movementsByBlock,
    underlyingTokensMovement: Object.entries(
      movementsByBlock.underlyingTokensMovement,
    ).reduce(
      (accumulator, [baseTokenAddress, baseTokenMovement]) => {
        accumulator[baseTokenAddress] = {
          ...baseTokenMovement,
          movementValue: formatUnits(
            baseTokenMovement.movementValueRaw,
            baseTokenMovement.decimals,
          ),
        }

        return accumulator
      },
      {} as Record<string, BaseTokenMovement & { movementValue: string }>,
    ),
  }
}

export function enrichTotalValueLocked(
  protocolTokenTvl: ProtocolTokenTvl,
  chainId: Chain,
): DisplayProtocolTokenTvl {
  return {
    ...protocolTokenTvl,
    totalSupply: formatUnits(
      protocolTokenTvl.totalSupplyRaw,
      protocolTokenTvl.decimals,
    ),
    tokens: protocolTokenTvl.tokens?.map((underlyingTokenTvl) => {
      return {
        ...underlyingTokenTvl,
        totalSupply: formatUnits(
          underlyingTokenTvl.totalSupplyRaw,
          underlyingTokenTvl.decimals,
        ),
        iconUrl: buildTrustAssetIconUrl(chainId, underlyingTokenTvl.address),
      }
    }),
  }
}
