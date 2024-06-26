import type { Protocol } from '../adapters/protocols'
import type { AdaptersController } from '../core/adaptersController'
import type { Chain } from '../core/constants/chains'
import type { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { Helpers } from '../scripts/helpers'
import type { Erc20Metadata } from './erc20Metadata'

export const TokenType = {
  Protocol: 'protocol',
  Reward: 'claimable',
  Underlying: 'underlying',
  UnderlyingClaimable: 'underlying-claimable',
} as const
export type TokenType = (typeof TokenType)[keyof typeof TokenType]

export const UnderlyingTokenTypeMap: {
  [key in TokenType]:
    | typeof TokenType.Underlying
    | typeof TokenType.UnderlyingClaimable
} = {
  [TokenType.UnderlyingClaimable]: TokenType.UnderlyingClaimable,
  [TokenType.Reward]: TokenType.UnderlyingClaimable,
  [TokenType.Underlying]: TokenType.Underlying,
  [TokenType.Protocol]: TokenType.Underlying,
} as const
export type UnderlyingTokenTypeMap =
  (typeof UnderlyingTokenTypeMap)[keyof typeof UnderlyingTokenTypeMap]

export const AssetType = {
  StandardErc20: 'StandardErc20', // transferrable; fungible positions; stakeable
  NonStandardErc20: 'NonStandardErc20', // such as nft, reward position, borrow positions (borrow positions cant be transferred)
} as const
export type AssetType = (typeof AssetType)[keyof typeof AssetType]

export const PositionType = {
  /**
   * Liquidity position e.g. a dex pool
   */
  Supply: 'supply',

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

export type UnwrapInput = {
  /**
   * Optional override param
   */
  blockNumber?: number
  /**
   * Protocol token address (LP token address).
   */
  protocolTokenAddress: string

  /**
   * Optional filter for pools that will be queried by an ID
   */
  tokenId?: string
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

export type AdapterSettings = {
  enablePositionDetectionByProtocolTokenTransfer: boolean
  includeInUnwrap: boolean
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

export interface GetPositionsInputWithTokenAddresses extends GetPositionsInput {
  protocolTokenAddresses: string[]
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

  /**
   * Optional filter for pools that will be queried by an ID
   */
  tokenIds?: string[]
}
export interface GetRewardPositionsInput {
  userAddress: string
  blockNumber?: number
  protocolTokenAddress: string
  tokenId?: string
}

export interface GetTotalValueLockedInput {
  /**
   * Optional filter for tokens that will be queried
   */
  protocolTokenAddresses?: string[]

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
  type: typeof TokenType.Underlying | typeof TokenType.UnderlyingClaimable
  priceRaw?: bigint
  tokens?: Underlying[]
}

/**
 * Reward position
 * The reward token may be a simple erc20 such as Dai.
 */
export type UnderlyingReward = Omit<Underlying, 'type'> & {
  type: typeof TokenType.UnderlyingClaimable
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

export interface UnwrappedTokenExchangeRate extends Erc20Metadata {
  type: typeof TokenType.Underlying
  underlyingRateRaw: bigint
}

export interface UnwrapExchangeRate extends Erc20Metadata {
  /**
   * Always equal to 1
   * We are finding the underlying value of 1 LP token
   */
  baseRate: 1
  type: typeof TokenType.Protocol
  tokens?: UnwrappedTokenExchangeRate[]
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

export interface TokenTvl extends Erc20Metadata {
  /**
   * Total underlying token locked in pool raw
   */
  totalSupplyRaw: bigint
}

export interface UnderlyingTokenTvl extends TokenTvl {
  type: typeof TokenType.Underlying
  tokens?: UnderlyingTokenTvl[]
  priceRaw?: bigint
}

export interface ProtocolTokenTvl extends TokenTvl {
  type: typeof TokenType.Protocol
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

  rawValues?: {
    rawEndPositionValues: ProtocolPosition[]
    rawStartPositionValues: ProtocolPosition[]
    rawWithdrawals: MovementsByBlock[]
    rawDeposits: MovementsByBlock[]
  }
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
  tokenId?: string
  type: typeof TokenType.Protocol
}

export interface CalculationData {
  withdrawals: number
  deposits: number
  repays: number
  borrows: number
  startPositionValue: number
  endPositionValue: number
  hasTokensWithoutUSDPrices?: boolean
  tokensWithoutUSDPrices?: Underlying[]
}

export interface ProtocolAdapterParams {
  provider: CustomJsonRpcProvider
  chainId: Chain
  protocolId: Protocol
  adaptersController: AdaptersController
  helpers: Helpers
}
