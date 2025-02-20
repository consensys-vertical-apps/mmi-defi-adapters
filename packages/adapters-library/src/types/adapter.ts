import { Connection } from '@solana/web3.js'
import type { Protocol } from '../adapters/protocols'
import type { AdaptersController } from '../core/adaptersController'
import type { Chain } from '../core/constants/chains'
import { Helpers, SolanaHelpers } from '../core/helpers'
import type { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import type { Erc20Metadata } from './erc20Metadata'

export const TokenType = {
  Protocol: 'protocol',
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

/**
 * Settings that control adapter behavior
 * @property {boolean} includeInUnwrap - Whether this adapter's tokens should be included in unwrap operations
 * @property {number} [version] - Optional version number for the adapter
 * @property {object|string|false} userEvent - Configuration for tracking user events:
 *   - If object: Contains topic0 hash and userAddressIndex for custom events
 *   - If "Transfer": Uses standard ERC20/721 Transfer events
 *   - If false: User events are not tracked
 */
export type AdapterSettings = {
  includeInUnwrap: boolean
  version?: number
  userEvent:
    | {
        /**
         * The keccak256 hash of the event signature to track
         * Must be a hex string starting with "0x"
         */
        topic0: `0x${string}`
        /**
         * The index of the user address that would have acquired a position (1-3)
         * For example, in Transfer(address from, address to, uint256 value) userAddressIndex is 2
         */
        userAddressIndex: 1 | 2 | 3
      }
    | 'Transfer'
    | false
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

export interface TokenBalance extends Erc20Metadata {
  /**
   * User's balance raw
   */
  balanceRaw: bigint
}

export interface TokenBalanceWithUnderlyings extends TokenBalance {
  tokens?: Underlying[]
}

/**
 * Underlying token balances of a position
 * The underlying token may be a simple erc20 such as Dai.
 * Should the underlying token be another protocol token then we expect that to be resolved down into the underlying simple erc20 tokens
 */
export interface Underlying extends TokenBalanceWithUnderlyings {
  type: typeof TokenType.Underlying | typeof TokenType.UnderlyingClaimable
  priceRaw?: bigint
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
export interface ProtocolPosition extends TokenBalanceWithUnderlyings {
  type: typeof TokenType.Protocol

  /**
   * Used by NFT Defi Positions, e.g. uniswapV3
   */
  tokenId?: string
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

export interface ProtocolAdapterParams {
  provider: CustomJsonRpcProvider
  chainId: Chain
  protocolId: Protocol
  adaptersController: AdaptersController
  helpers: Helpers
}

export interface SolanaProtocolAdapterParams {
  provider: Connection
  protocolId: Protocol
  adaptersController: AdaptersController
  helpers: SolanaHelpers
}

export type AggregatedFiatBalances = Record<
  string,
  {
    protocolTokenMetadata: Erc20Metadata & { tokenId?: string }
    usdRaw: bigint
    hasTokensWithoutUSDPrices?: boolean
    tokensWithoutUSDPrices?: Underlying[]
  }
>
