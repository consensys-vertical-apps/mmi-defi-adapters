import { Erc20Metadata } from '../core/utils/getTokenMetadata.js'
import {
  MovementsByBlock,
  ProfitsTokensWithRange,
  ProtocolAprToken,
  ProtocolApyToken,
  ProtocolDetails,
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockedToken,
} from './adapter.js'

export type DefiPositionResponse = ProtocolDetails & {
  tokens: ProtocolToken[]
}

export type PricePerShareResponse = ProtocolDetails & {
  tokens: ProtocolPricePerShareToken[]
}
export type APRResponse = ProtocolDetails & {
  tokens: ProtocolAprToken[]
}
export type APYResponse = ProtocolDetails & {
  tokens: ProtocolApyToken[]
}

export type TotalValueLockResponse = ProtocolDetails & {
  tokens: ProtocolTotalValueLockedToken[]
}

export type DefiProfitsResponse = ProtocolDetails & ProfitsTokensWithRange

export type DefiMovementsResponse = ProtocolDetails & {
  movements: {
    protocolToken: Erc20Metadata
    positionMovements: MovementsByBlock[]
  }[]
}
