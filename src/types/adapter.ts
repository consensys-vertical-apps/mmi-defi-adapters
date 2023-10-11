import { ethers } from 'ethers'
import { Protocol } from '../adapters/protocols'
import { Chain } from '../core/constants/chains'
import { Erc20Metadata } from './erc20Metadata'

export const TokenType = {
  Protocol: 'protocol',
  Reward: 'claimable',
  Underlying: 'underlying',
  UnderlyingClaimableFee: 'underlying-claimable-fee',
} as const
export type TokenType = (typeof TokenType)[keyof typeof TokenType]

export const PositionType = {
  /**
   * Liquidity position e.g. a dex pool
   */
  Supply: 'supply',

  /**
   * Providing liquidity to a lending and borrow protocol
   */
  Lend: 'lend',

  /**
   * Getting a loan from a lending and borrow protocol
   */
  Borrow: 'borrow',

  /**
   * Staking a token e.g. staking eth or staking an lp token
   */
  Staked: 'stake',
} as const
export type PositionType = (typeof PositionType)[keyof typeof PositionType]

export type GetBalancesInput = GetPositionsInput & {
  provider: ethers.JsonRpcProvider
  chainId: Chain
  tokens: Erc20Metadata[]
}

export type GetConversionRateInput = {
  /**
   * Optional override param
   */
  blockNumber?: number
  /**
   * Protocol token address (LP token address).
   */
  protocolTokenAddress: string
}
export type GetApyInput = {
  /**
   * Optional override param
   */
  blockNumber?: number

  /**
   * Protocol token address (LP token address).
   */
  protocolTokenAddress: string
}
export type GetAprInput = {
  /**
   * Optional override param
   */
  blockNumber?: number
  /**
   * Protocol token address (LP token address).
   */
  protocolTokenAddress: string
}

export type GetEventsInput = {
  /**
   * User address we want to get events for
   */
  userAddress: string

  /**
   * Protocol token we want to check related events for
   */
  protocolTokenAddress: string

  /**
   * Starting blocknumber to check from
   */
  fromBlock: number

  /**
   * End blocknumber we want to check to e.g. current blocknumber
   */
  toBlock: number

  /**
   * Used by NFT Defi Positions, e.g. uniswapV3
   */
  tokenId?: string
}
export interface GetProfitsInput {
  /**
   * User address we want to get earned profits for
   */
  userAddress: string
  /**
   * Starting blocknumber to check profits earned from
   */
  fromBlock: number

  /**
   * Starting blocknumber to check profits earned to
   */
  toBlock: number
}

export type ProtocolDetails = {
  /**
   * Unique protocol id
   */
  protocolId: Protocol

  /**
   * Chain this adapter is for
   */
  chainId: Chain

  /**
   * Name of protocol
   */
  name: string

  /**
   * Description of protocol
   */
  description: string

  /**
   * Protocol icon
   */
  iconUrl: string

  /**
   * Protocol website
   */
  siteUrl: string

  /**
   * Type of position
   * One adapter per type
   */
  positionType: PositionType

  /**
   * Unique protocol-product name
   */
  product: string
}

export interface GetPositionsInput {
  /**
   * Address of the user can be any type of address EOA/Contract
   */
  userAddress: string

  /**
   * Optional override param
   */
  blockNumber?: number
}
export interface GetClaimableRewardsInput {
  /**
   * Address of the user can be any type of address EOA/Contract
   */
  userAddress: string

  /**
   * Optional override param
   */
  blockNumber?: number
}
export interface GetPricePerShareInput {
  /**
   * Optional override param
   */
  blockNumber?: number
}
export interface GetTotalValueLockedInput {
  /**
   * Optional override param
   */
  blockNumber?: number
}

export interface TokenBalance extends Erc20Metadata {
  /**
   * User's balance raw
   */
  balanceRaw: bigint
}

/**
 * Underlying token balances of a position
 * The underlying token may be a simple erc20 such as Dai.
 * Should the underlying token be another protocol token then we expect that to be resolved down into the underlying simple erc20 tokens
 */
export interface Underlying extends TokenBalance {
  type: typeof TokenType.Underlying | typeof TokenType.UnderlyingClaimableFee

  tokens?: Underlying[]
}

/**
 * User's position, includes balance of protocol token related underlying token balances
 */
export interface ProtocolRewardPosition extends Erc20Metadata {
  type: typeof TokenType.Protocol

  /**
   * Underlying token balances
   */
  tokens?: ClaimableRewards[]
}

/**
 *
 * Claimable rewards are mapped one to one to the underlying "reward" token
 * Therefore they always have a underlying-token which is the reward token
 */
export interface ClaimableRewards extends TokenBalance {
  type: typeof TokenType.Reward
  tokens: Underlying[]
}

/**
 * User's position, includes balance of protocol token related underlying token balances
 */
export interface ProtocolPosition extends TokenBalance {
  type: typeof TokenType.Protocol

  /**
   * Used by NFT Defi Positions, e.g. uniswapV3
   */
  tokenId?: string

  /**
   * Underlying token balances
   */
  tokens?: Underlying[]
}

export interface UnderlyingTokenRate extends Erc20Metadata {
  type: typeof TokenType.Underlying
  underlyingRateRaw: bigint
}

export interface ProtocolTokenUnderlyingRate extends Erc20Metadata {
  /**
   * Always equal to 1
   * We are finding the underlying value of 1 LP token
   */
  baseRate: 1
  type: typeof TokenType.Protocol
  tokens?: UnderlyingTokenRate[]
}

export interface BaseTokenMovement extends Erc20Metadata {
  movementValueRaw: bigint
}

export interface MovementsByBlock {
  protocolToken: Erc20Metadata
  /**
   * Movements in or out of a protocol position
   */
  underlyingTokensMovement: Record<string, BaseTokenMovement>

  /**
   * Blocknumber movement was executed
   */
  blockNumber: number
}

export interface ProtocolTokenApy extends Erc20Metadata {
  /**
   * Current apy of protocol pool
   */
  apyDecimal: number
}

export interface ProtocolTokenApr extends Erc20Metadata {
  /**
   * Current apr of protocol pool
   */
  aprDecimal: number
}

export interface UnderlyingTokenTvl extends Erc20Metadata {
  type: typeof TokenType.Underlying
  /**
   * Total underlying token locked in pool raw
   */
  totalSupplyRaw: bigint
}

export interface ProtocolTokenTvl extends Erc20Metadata {
  type: typeof TokenType.Protocol
  /**
   * Total underlying token locked in pool raw
   */
  totalSupplyRaw: bigint
  tokens?: UnderlyingTokenTvl[]
}

export interface ProfitsWithRange {
  /**
   * Calculated profits from this block number
   */
  fromBlock: number

  /**
   * Calculated profits to this block number
   */
  toBlock: number
  /**
   * Profits earned by user address
   */
  tokens: PositionProfits[]
}

export interface UnderlyingProfitValues extends Erc20Metadata {
  type: typeof TokenType.Underlying | typeof TokenType.Reward

  /**
   * Profit made in this token for this period
   */
  profitRaw: bigint

  /**
   * Numbers used to calculate profit value
   */
  calculationData: CalculationData
}

export interface PositionProfits extends Erc20Metadata {
  type: typeof TokenType.Protocol
  tokens: UnderlyingProfitValues[]
}

export interface CalculationData {
  withdrawalsRaw: bigint
  depositsRaw: bigint
  startPositionValueRaw: bigint
  endPositionValueRaw: bigint
}

export interface ProtocolAdapterParams {
  provider: ethers.JsonRpcProvider
  chainId: Chain
  protocolId: Protocol
}
