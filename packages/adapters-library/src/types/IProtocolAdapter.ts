import type { Protocol } from '../adapters/protocols'
import type { GetTransactionParams } from '../adapters/supportedProtocols'
import type { AdaptersController } from '../core/adaptersController'
import type { Chain } from '../core/constants/chains'
import { Helpers } from '../scripts/helpers'
import type {
  AdapterSettings,
  GetEventsInput,
  GetPositionsInput,
  GetRewardPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  Underlying,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from './adapter'
import type { Erc20Metadata } from './erc20Metadata'

export interface IProtocolAdapter {
  adapterSettings: AdapterSettings

  helpers?: Helpers

  /**
   * Unique identifier of the protocol.
   */
  protocolId: Protocol

  /**
   * Unique identifier of the blockchain network.
   */
  chainId: Chain

  /**
   * Unique identifier for this protocol adapter
   */
  productId: string

  adaptersController: AdaptersController

  /**
   * @remarks Returns high level metadata for the protocol
   *
   * @returns {ProtocolDetails} Object containing details about the protocol such as name and description.
   */
  getProtocolDetails(): ProtocolDetails

  /**
   * @remarks Returns array of pool tokens (lp tokens) for the protocol
   *
   * @returns {Promise<(Erc20Metadata & { tokenId?: string })[]>} An array of objects detailing the protocol tokens.
   */
  getProtocolTokens(): Promise<(Erc20Metadata & { tokenId?: string })[]>

  /**
   *
   * @remarks Returns array of user positions opened in this protocol
   *
   * @param {GetPositionsInput} input - Object with user-address and optional blockNumber override.
   * @returns {Promise<ProtocolPosition[]>} An array of objects detailing the user positions.
   */
  getPositions(input: GetPositionsInput): Promise<ProtocolPosition[]>

  /**
   *
   * @remarks Returns "price" of lp-tokens in the form of the underlying tokens. Unwraps tokens to the current unwrapping exchange rate
   * @remarks Read only method, doesn't update blockchain state.
   *
   * @param {UnwrapInput} input - Object with protocol-token-address and optional blockNumber override.
   * @returns {Promise<UnwrapExchangeRate>} Object detailing the price per share of the protocol token.
   */
  unwrap(input: UnwrapInput): Promise<UnwrapExchangeRate>

  /**
   *
   * @remarks Returns tx params
   *
   * @param {TransactionParamsInput} input tx input params
   * @returns {Promise<{to:string, data: string}>} transaction
   */
  getTransactionParams?(
    input: GetTransactionParams,
  ): Promise<{ to: string; data: string }>

  /**
   *
   * @remarks Returns the user's withdrawals from a position
   *
   * @param {GetEventsInput} input - Object specifying user-address, protocol-token-address (pool), and the block range.
   * @returns {Promise<MovementsByBlock[]>} Array of objects detailing withdrawal events within the specified block range.
   */
  getWithdrawals(input: GetEventsInput): Promise<MovementsByBlock[]>

  /**
   *
   * @remarks Returns the user's deposits to a position
   *
   * @param {GetEventsInput} input - Object specifying user-address, protocol-token-address (pool), and the block range.
   * @returns {Promise<MovementsByBlock[]>} Array of objects detailing deposit events within the specified block range.
   */
  getDeposits(input: GetEventsInput): Promise<MovementsByBlock[]>
  /**
   *
   * @remarks Returns the user's withdrawals from a position
   *
   * @param {GetEventsInput} input - Object specifying user-address, protocol-token-address (pool), and the block range.
   * @returns {Promise<MovementsByBlock[]>} Array of objects detailing withdrawal events within the specified block range.
   */
  getBorrows?(input: GetEventsInput): Promise<MovementsByBlock[]>

  /**
   *
   * @remarks Returns the user's deposits to a position
   *
   * @param {GetEventsInput} input - Object specifying user-address, protocol-token-address (pool), and the block range.
   * @returns {Promise<MovementsByBlock[]>} Array of objects detailing deposit events within the specified block range.
   */
  getRepays?(input: GetEventsInput): Promise<MovementsByBlock[]>

  /**
   *
   * @remarks Returns the Tvl per pool defined in the underlying token
   *
   * @param {GetTotalValueLockedInput} input - Object with optional blockNumber override.
   * @returns {Promise<ProtocolTokenTvl[]>} An array of objects detailing the total value locked in each protocol pool.
   */
  getTotalValueLocked(
    input: GetTotalValueLockedInput,
  ): Promise<ProtocolTokenTvl[]>

  getRewardPositions?(
    input: GetRewardPositionsInput,
  ): Promise<UnderlyingReward[]>

  getRewardWithdrawals?({
    userAddress,
    protocolTokenAddress,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]>

  getExtraRewardPositions?(
    input: GetRewardPositionsInput,
  ): Promise<UnderlyingReward[]>

  getExtraRewardWithdrawals?({
    userAddress,
    protocolTokenAddress,
    tokenId,
  }: GetEventsInput): Promise<MovementsByBlock[]>
}
