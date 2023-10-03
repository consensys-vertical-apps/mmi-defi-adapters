import {
  MovementsByBlock,
  ProfitsWithRange,
  ProtocolTokenApr,
  ProtocolTokenApy,
  ProtocolDetails,
  ProtocolTokenUnderlyingRate,
  ProtocolPosition,
  ProtocolTokenTvl,
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

export type AddBalance<T> = {
  [K in keyof T]: K extends 'balanceRaw'
    ? T[K] & { balance: string }
    : T[K] extends object
    ? AddBalance<T[K]>
    : T[K]
}

export type DefiPositionResponse = AdapterResponse<{
  tokens: AddBalance<ProtocolPosition>[]
}>

export type PricePerShareResponse = AdapterResponse<{
  tokens: ProtocolTokenUnderlyingRate[]
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

export type DefiProfitsResponse = AdapterResponse<ProfitsWithRange>

export type DefiMovementsResponse = AdapterResponse<{
  movements: {
    protocolToken: Erc20Metadata
    positionMovements: MovementsByBlock[]
  }[]
}>
