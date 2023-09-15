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

export type AdapterError = {
  error: {
    message: string
    details?: object
  }
}

export type AdapterResponse<T> = ProtocolDetails & (T | AdapterError)

export type DefiPositions = {
  tokens: ProtocolToken[]
}
export type DefiPositionResponse = AdapterResponse<DefiPositions>

export type PricePerShare = {
  tokens: ProtocolPricePerShareToken[]
}
export type PricePerShareResponse = AdapterResponse<PricePerShare>

export type APR = {
  tokens: ProtocolAprToken[]
}
export type APRResponse = AdapterResponse<APR>

export type APY = {
  tokens: ProtocolApyToken[]
}
export type APYResponse = AdapterResponse<APY>

export type TotalValueLock = {
  tokens: ProtocolTotalValueLockedToken[]
}
export type TotalValueLockResponse = AdapterResponse<TotalValueLock>

export type DefiProfitsResponse = AdapterResponse<ProfitsTokensWithRange>

export type DefiMovements = {
  movements: {
    protocolToken: Erc20Metadata
    positionMovements: MovementsByBlock[]
  }[]
}
export type DefiMovementsResponse = AdapterResponse<DefiMovements>
