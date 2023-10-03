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

export type AddPositionsBalance<T> = T extends {
  balanceRaw: bigint
  tokens?: Underlying[]
}
  ? Omit<T, 'tokens'> & {
      balance: string
      tokens: AddPositionsBalance<Underlying>[]
    }
  : T

export type DefiPositionResponse = AdapterResponse<{
  tokens: AddPositionsBalance<ProtocolPosition>[]
}>

export type PricePerShareResponse = AdapterResponse<{
  tokens: Omit<ProtocolTokenUnderlyingRate, 'tokens'> &
    {
      tokens: (UnderlyingTokenRate & { underlyingRate: string })[]
    }[]
}>

export type APRResponse = AdapterResponse<{
  tokens: ProtocolTokenApr[]
}>

export type APYResponse = AdapterResponse<{
  tokens: ProtocolTokenApy[]
}>

export type TotalValueLockResponse = AdapterResponse<{
  tokens: ProtocolTokenTvl[]
}>

export type AddUnderlyingProfitsBalance<T> = T extends {
  tokens: UnderlyingProfitValues[]
}
  ? Omit<T, 'tokens'> & {
      tokens: (UnderlyingProfitValues & { profit: string })[]
    }
  : T

export type AddProfitsBalance<T> = T extends {
  tokens: PositionProfits[]
}
  ? Omit<T, 'tokens'> & {
      tokens: AddUnderlyingProfitsBalance<PositionProfits>[]
    }
  : T

export type DefiProfitsResponse = AdapterResponse<ProfitsWithRange>

export type DefiMovementsResponse = AdapterResponse<{
  movements: {
    protocolToken: Erc20Metadata
    positionMovements: MovementsByBlock[]
  }[]
}>
