import { ethers } from 'ethers'
import { Protocol } from '../adapters'
import { Chain } from '../core/constants/chains'
import { Erc20Metadata } from '../core/utils/getTokenMetadata'

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
  provider: ethers.JsonRpcProvider
  chainId: Chain
  tokens: Erc20Metadata[]
}

export type GetPricesInput = {
  blockNumber?: number
  protocolTokenAddress: string
}
export type GetApyInput = {
  blockNumber?: number
  protocolTokenAddress: string
}
export type GetAprInput = {
  blockNumber?: number
  protocolTokenAddress: string
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

export type TokenBalance = Erc20Metadata & {
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

export type BasePricePerShareToken = Erc20Metadata & {
  pricePerShareRaw: bigint
  pricePerShare: string
  type: typeof TokenType.Underlying
}

export type ProtocolPricePerShareToken = Erc20Metadata & {
  share: number
  type: typeof TokenType.Protocol
  tokens?: BasePricePerShareToken[]
}

export type BaseTokenMovement = Erc20Metadata & {
  movementValue: string
  movementValueRaw: bigint
}

export type MovementsByBlock = {
  underlyingTokensMovement: Record<string, BaseTokenMovement>
  blockNumber: number
}

export type ProtocolApyToken = Erc20Metadata & {
  apyDecimal: string
}

export type ProtocolAprToken = Erc20Metadata & {
  aprDecimal: string
}

export type TokenTotalValueLock = Erc20Metadata & {
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

export type BaseProfitsToken = Erc20Metadata & {
  type: typeof TokenType.Underlying | typeof TokenType.Claimable
  profitRaw: bigint
  profit: string
}

export type ProtocolProfitsToken = Erc20Metadata & {
  type: typeof TokenType.Protocol
  tokens: BaseProfitsToken[]
}

export interface IProtocolAdapter {
  protocolId: Protocol
  chainId: Chain

  getProtocolDetails(): ProtocolDetails
  getProtocolTokens(): Promise<Erc20Metadata[]>
  getPositions(input: GetPositionsInput): Promise<ProtocolToken[]>
  getPricePerShare(input: GetPricesInput): Promise<ProtocolPricePerShareToken>
  getWithdrawals(input: GetEventsInput): Promise<MovementsByBlock[]>
  getDeposits(input: GetEventsInput): Promise<MovementsByBlock[]>
  getClaimedRewards(input: GetEventsInput): Promise<MovementsByBlock[]>
  getTotalValueLocked(
    input: GetTotalValueLockedInput,
  ): Promise<ProtocolTotalValueLockedToken[]>
  getOneDayProfit(input: GetProfitsInput): Promise<ProfitsTokensWithRange>
  getApy(input: GetApyInput): Promise<ProtocolApyToken>
  getApr(input: GetAprInput): Promise<ProtocolAprToken>
}

export type ProtocolAdapterParams = {
  provider: ethers.JsonRpcProvider
  chainId: Chain
  protocolId: Protocol
}
