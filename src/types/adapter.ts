import { ethers } from 'ethers'
import { Chain } from '../core/constants/chains'
import { Protocol } from '../core/constants/protocols'
import { ERC20 } from '../core/utils/getTokenMetadata'

export const TokenType = {
  Protocol: 'protocol',
  Claimable: 'claimable',
  Underlying: 'underlying',
} as const
export type TokenType = (typeof TokenType)[keyof typeof TokenType]

export const PositionType = {
  Supply: 'supply',
  Borrow: 'borrow',
  Staked: 'stake',
} as const
export type PositionType = (typeof PositionType)[keyof typeof PositionType]

export type GetBalancesInput = GetPositionsInput & {
  provider: ethers.providers.StaticJsonRpcProvider
  chainId: Chain
  tokens: ERC20[]
}

export type GetPricesInput = {
  blockNumber?: number
}

export type TradeEvent = {
  trades: Record<string, number>
  protocolTokenAddress: string
  blockNumber: number
}

export type GetEventsInput = {
  userAddress: string
  protocolTokenAddress: string
  fromBlock: number
  toBlock: number
}
export interface GetProfitsInput {
  userAddress: string
  blockNumber: number
}

export type GetTradeEvents = {
  userAddress: string
  smartContractAddress: string
  fromBlock: number
  toBlock: number
}

export type ProtocolDetails = {
  protocolId: Protocol
  chainId: Chain
  name: string
  description: string
  iconUrl: string
  siteUrl: string
  positionType: PositionType
}

export type GetPositionsInput = {
  userAddress: string
  blockNumber?: number
}
export type GetPricePerShareInput = {
  blockNumber?: number
}
export type GetTotalValueLockedInput = {
  blockNumber?: number
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

export type ProfitsTokensWithRange = {
  fromBlock: number
  toBlock: number
  tokens: ProtocolProfitsToken[]
}

export type BaseProfitsToken = ERC20 & {
  type: typeof TokenType.Underlying | typeof TokenType.Claimable
  profit: number
}

export type ProtocolProfitsToken = ERC20 & {
  type: typeof TokenType.Protocol
  tokens: BaseProfitsToken[]
}

export interface IProtocolAdapter {
  getProtocolDetails(): ProtocolDetails
  getPositions(input: GetPositionsInput): Promise<ProtocolToken[]>
  getPricePerShare(input: GetPricesInput): Promise<ProtocolPricePerShareToken[]>
  getWithdrawals(input: GetEventsInput): Promise<TradeEvent[]>
  getDeposits(input: GetEventsInput): Promise<TradeEvent[]>
  getClaimedRewards(input: GetEventsInput): Promise<TradeEvent[]>
  getTotalValueLocked(
    input: GetTotalValueLockedInput,
  ): Promise<ProtocolTotalValueLockedToken[]>
  getOneDayProfit: (input: GetProfitsInput) => Promise<ProfitsTokensWithRange>
}
