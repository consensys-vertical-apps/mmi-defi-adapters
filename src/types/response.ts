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
  TokenType,
  TokenBalance,
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
  PositionBalance extends TokenBalance & {
    type: TokenType
    tokens?: Underlying[]
  },
> = Omit<PositionBalance, 'tokens'> & {
  balance: string
  tokens?: DisplayPosition<Underlying>[]
} & (PositionBalance['type'] extends
    | typeof TokenType.Underlying
    | typeof TokenType.UnderlyingClaimableFee
    ? { iconUrl: string }
    : Record<string, never>)

export type DefiProfitsResponse = AdapterResponse<DisplayProfitsWithRange>

export type DisplayProfitsWithRange = Omit<ProfitsWithRange, 'tokens'> & {
  tokens: DisplayPositionProfits[]
}

type DisplayPositionProfits = Omit<PositionProfits, 'tokens'> & {
  tokens: (UnderlyingProfitValues & { profit: string; iconUrl: string })[]
}

export type PricePerShareResponse = AdapterResponse<{
  tokens: DisplayProtocolTokenUnderlyingRate[]
}>

export type DisplayProtocolTokenUnderlyingRate = Omit<
  ProtocolTokenUnderlyingRate,
  'tokens'
> & {
  tokens?: (UnderlyingTokenRate & { underlyingRate: string; iconUrl: string })[]
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
  tokens?: (UnderlyingTokenTvl & { totalSupply: string; iconUrl: string })[]
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
