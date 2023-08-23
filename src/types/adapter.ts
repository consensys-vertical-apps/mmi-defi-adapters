import { Chain } from '../core/constants/chains'
import { Protocol } from '../core/constants/protocols'
import { ERC20 } from '../core/utils/getTokenMetadata'
import type {
  ProtocolPricePerShareToken,
  ProtocolToken,
  ProtocolTotalValueLockToken,
} from './response'

import { ethers } from 'ethers'

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
  lpTokens: ERC20[]
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
  blockNumbers?: Record<Chain, number>
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
export type GetTotalValueLockInput = {
  blockNumber?: number
}

export type DefiProfitsResponse = {
  fromBlock: number
  toBlock: number
  tokens: Profits[]
}

export type Profits = ERC20 & {
  tokens: UnderlyingProfits[]
  type: typeof TokenType.Protocol
}

export type UnderlyingProfits = ERC20 & {
  profit: number
  type: typeof TokenType.Underlying | typeof TokenType.Claimable
}

export interface IProtocolAdapter {
  getProtocolDetails(): ProtocolDetails
  getPositions(input: GetPositionsInput): Promise<ProtocolToken[]>
  getPricePerShare(input: GetPricesInput): Promise<ProtocolPricePerShareToken[]>
  getWithdrawals(input: GetEventsInput): Promise<TradeEvent[]>
  getDeposits(input: GetEventsInput): Promise<TradeEvent[]>
  getTotalValueLock(
    input: GetTotalValueLockInput,
  ): Promise<ProtocolTotalValueLockToken[]>
  getOneDayProfit: (input: GetProfitsInput) => Promise<DefiProfitsResponse>
}
