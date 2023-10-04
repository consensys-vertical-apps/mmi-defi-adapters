import {
  MovementsByBlock,
  ProfitsWithRange,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolDetails,
  ProtocolTokenUnderlyingRate,
  ProtocolPosition,
  ProtocolTokenTvl,
  Underlying,
  UnderlyingTokenRate,
  PositionProfits,
  UnderlyingProfitValues,
  BaseTokenMovement,
  UnderlyingTokenTvl,
} from './adapter'
import { Erc20Metadata } from './erc20Metadata'

export type AdapterErrorResponse = {
  error: {
    message: string
    details?: Record<string, unknown>
  }
}

export type AdapterResponse<ProtocolResponse> = ProtocolDetails &
  (
    | (ProtocolResponse & { success: true })
    | (AdapterErrorResponse & { success: false })
  )

export type DefiPositionResponse = AdapterResponse<{
  tokens: DisplayPosition<ProtocolPosition>[]
}>

export type DisplayPosition<
  PositionBalance extends {
    balanceRaw: bigint
    tokens?: Underlying[]
  },
> = Omit<PositionBalance, 'tokens'> & {
  balance: string
  tokens?: DisplayPosition<Underlying>[]
}

export type DefiProfitsResponse = AdapterResponse<DisplayProfitsWithRange>

export type DisplayProfitsWithRange = Omit<ProfitsWithRange, 'tokens'> & {
  tokens: DisplayPositionProfits[]
}

export type DisplayPositionProfits = Omit<PositionProfits, 'tokens'> & {
  tokens: (UnderlyingProfitValues & { profit: string })[]
}

export type PricePerShareResponse = AdapterResponse<{
  tokens: DisplayProtocolTokenUnderlyingRate[]
}>

export type DisplayProtocolTokenUnderlyingRate = Omit<
  ProtocolTokenUnderlyingRate,
  'tokens'
> & {
  tokens?: (UnderlyingTokenRate & { underlyingRate: string })[]
}

export type APRResponse = AdapterResponse<{
  tokens: ProtocolTokenApr[]
}>

export type APYResponse = AdapterResponse<{
  tokens: ProtocolTokenApy[]
}>

export type TotalValueLockResponse = AdapterResponse<{
  tokens: DisplayProtocolTokenTvl[]
}>

export type DisplayProtocolTokenTvl = Omit<ProtocolTokenTvl, 'tokens'> & {
  totalSupply: string
  tokens?: (UnderlyingTokenTvl & { totalSupply: string })[]
}

export type DefiMovementsResponse = AdapterResponse<{
  movements: {
    protocolToken: Erc20Metadata
    positionMovements: DisplayMovementsByBlock[]
  }[]
}>

export type DisplayMovementsByBlock = Omit<
  MovementsByBlock,
  'underlyingTokensMovement'
> & {
  underlyingTokensMovement: Record<
    string,
    BaseTokenMovement & { movementValue: string }
  >
}
