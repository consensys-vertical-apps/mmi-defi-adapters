import { ERC20 } from '../core/utils/getTokenMetadata'
import {
  ProfitsTokensWithRange,
  ProtocolAprToken,
  ProtocolApyToken,
  ProtocolDetails,
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockedToken,
  MovementsByBlock,
} from './adapter'

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
  movementsByBlock: {
    protocolToken: ERC20
    movementsByBlock: MovementsByBlock[]
  }[]
}
