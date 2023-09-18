import { Erc20Metadata } from '../core/utils/getTokenMetadata'
import {
  MovementsByBlock,
  ProfitsTokensWithRange,
  ProtocolAprToken,
  ProtocolApyToken,
  ProtocolDetails,
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockedToken,
} from './adapter'

export type AdapterErrorResponse = {
  error: {
    message: string
    details?: object
  }
}

export type AdapterResponse<T> = ProtocolDetails & (T | AdapterErrorResponse)

export type DefiPositionResponse = AdapterResponse<{
  tokens: ProtocolToken[]
}>

export type PricePerShareResponse = AdapterResponse<{
  tokens: ProtocolPricePerShareToken[]
}>

export type APRResponse = AdapterResponse<{
  tokens: ProtocolAprToken[]
}>

export type APYResponse = AdapterResponse<{
  tokens: ProtocolApyToken[]
}>

export type TotalValueLockResponse = AdapterResponse<{
  tokens: ProtocolTotalValueLockedToken[]
}>

export type DefiProfitsResponse = AdapterResponse<ProfitsTokensWithRange>

export type DefiMovementsResponse = AdapterResponse<{
  movements: {
    protocolToken: Erc20Metadata
    positionMovements: MovementsByBlock[]
  }[]
}>
