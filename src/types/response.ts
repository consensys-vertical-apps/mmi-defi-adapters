import {
  ProfitsTokensWithRange,
  ProtocolDetails,
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockedToken,
} from './adapter'

export type DefiPositionResponse = ProtocolDetails & {
  tokens: ProtocolToken[]
}

export type PricePerShareResponse = ProtocolDetails & {
  tokens: ProtocolPricePerShareToken[]
}

export type TotalValueLockResponse = ProtocolDetails & {
  tokens: ProtocolTotalValueLockedToken[]
}

export type DefiProfitsResponse = ProtocolDetails & ProfitsTokensWithRange
