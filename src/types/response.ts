import { ERC20 } from '../core/utils/getTokenMetadata'
import { ProtocolDetails, TokenType } from './adapter'

export type DefiPositionResponse = ProtocolDetails & {
  tokens: ProtocolToken[]
}

export type PricePerShareResponse = ProtocolDetails & {
  tokens: ProtocolPricePerShareToken[]
}

export type TotalValueLockResponse = ProtocolDetails & {
  tokens: ProtocolTotalValueLockedToken[]
}

export type TokenBalance = ERC20 & {
  balanceRaw: bigint
  balance: string
}

export type BaseToken = TokenBalance & {
  type: typeof TokenType.Underlying | typeof TokenType.Claimable
  tokens?: BaseToken[]
}

export type ProtocolToken = TokenBalance & {
  type: typeof TokenType.Protocol
  tokens?: BaseToken[]
}

export type BasePricePerShareToken = ERC20 & {
  pricePerShare: number
  type: typeof TokenType.Underlying
}

export type ProtocolPricePerShareToken = ERC20 & {
  share: number
  type: typeof TokenType.Protocol
  tokens?: BasePricePerShareToken[]
}

export type TokenTotalValueLock = ERC20 & {
  totalSupplyRaw: bigint
  totalSupply: string
}

export type BaseTotalValueLockToken = TokenTotalValueLock & {
  type: typeof TokenType.Underlying
}

export type ProtocolTotalValueLockedToken = TokenTotalValueLock & {
  type: typeof TokenType.Protocol
  tokens?: BaseTotalValueLockToken[]
}
