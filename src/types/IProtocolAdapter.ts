import type { Protocol } from '../adapters/protocols'
import type { AdaptersController } from '../core/adaptersController'
import type { Chain } from '../core/constants/chains'
import type {
  ProtocolDetails,
  GetPositionsInput,
  ProtocolPosition,
  GetConversionRateInput,
  ProtocolTokenUnderlyingRate,
  GetEventsInput,
  MovementsByBlock,
  GetTotalValueLockedInput,
  ProtocolTokenTvl,
  GetApyInput,
  ProtocolTokenApy,
  GetAprInput,
  ProtocolTokenApr,
} from './adapter'
import type { Erc20Metadata } from './erc20Metadata'
import { WriteInputs } from './writeAction'

export interface IProtocolAdapter {
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
   * @remarks Returns "price" of lp-tokens in the form of the underlying tokens
   *
   * @param {GetConversionRateInput} input - Object with protocol-token-address and optional blockNumber override.
   * @returns {Promise<ProtocolTokenUnderlyingRate>} Object detailing the price per share of the protocol token.
   */
  getProtocolTokenToUnderlyingTokenRate(
    input: GetConversionRateInput,
  ): Promise<ProtocolTokenUnderlyingRate>

  /**
   *
   * @remarks Returns tx params
   *
   * @param {TransactionParamsInput} input tx input params
   * @returns {Promise<{to:string, data: string}>} transaction
   */
  getTransactionParams?(
    input: WriteInputs,
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

  /**
   *
   * @remarks Returns Apy per pool
   *
   * @param {GetApyInput} input - Object with protocol-token-address and optional blockNumber override.
   * @returns {Promise<ProtocolTokenApy>} Object detailing the Annual Percentage Yield for each protocol pool without reward APY.
   */
  getApy(input: GetApyInput): Promise<ProtocolTokenApy>

  /**
   *
   * @remarks Returns Apr made per pool
   *
   * @param {GetAprInput} input - Object with protocol-token-address and optional blockNumber override.
   * @returns {Promise<ProtocolTokenApr>} Object detailing the Annual Percentage Rate without reward APR for each protocol pool.
   */
  getApr(input: GetAprInput): Promise<ProtocolTokenApr>
}
