import type { Protocol } from '../adapters/protocols'
import type { AdaptersController } from '../core/adaptersController'
import type { Chain } from '../core/constants/chains'
import type { CustomJsonRpcProvider } from '../core/utils/customJsonRpcProvider'
import type { Erc20Metadata } from './erc20Metadata'

export const TokenType = {
  Protocol: 'protocol',
  Reward: 'claimable',
  Underlying: 'underlying',
  UnderlyingClaimable: 'underlying-claimable',
  Fiat: 'fiat',
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
  /**
   * Claimable rewards, these type of positions will be merged with the equivalent lp position
   */
  Reward: 'reward',

  FiatPrices: 'fiat-prices',
} as const
export type PositionType = (typeof PositionType)[keyof typeof PositionType]

export type GetBalancesInput = GetPositionsInput & {
  provider: CustomJsonRpcProvider
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

  /**
   * Optional filter for pools that will be queried
   */
  protocolTokenAddresses?: string[]
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
  productId: string
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

  /**
   * Optional filter for pools that will be queried
   */
  protocolTokenAddresses?: string[]
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
  type:
    | typeof TokenType.Underlying
    | typeof TokenType.UnderlyingClaimable
    | typeof TokenType.Fiat

  tokens?: Underlying[]
}

/**
 * User's position, includes balance of protocol token related underlying token balances
 */
export interface ProtocolPosition extends TokenBalance {
  type: typeof TokenType.Protocol | typeof TokenType.Reward

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
  type: typeof TokenType.Underlying | typeof TokenType.Fiat
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

export interface MovementsByBlock {
  protocolToken: Erc20Metadata & { tokenId?: string }
  /**
   * Movements in or out of a protocol position
   */
  tokens: Underlying[]

  /**
   * Blocknumber movement was executed
   */
  blockNumber: number

  transactionHash: string
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
  /**
   * Profit made in this token for this period
   */
  profit: number

  performance: number

  /**
   * Numbers used to calculate profit value
   */
  calculationData: CalculationData
}

export interface PositionProfits extends Erc20Metadata, UnderlyingProfitValues {
  type: typeof TokenType.Protocol
}

export interface CalculationData {
  withdrawals: number
  deposits: number
  startPositionValue: number
  endPositionValue: number
}

export interface ProtocolAdapterParams {
  provider: CustomJsonRpcProvider
  chainId: Chain
  protocolId: Protocol
  adaptersController: AdaptersController
}
