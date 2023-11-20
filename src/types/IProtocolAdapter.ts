import { Protocol } from '../adapters/protocols'
import { Chain } from '../core/constants/chains'
import {
  ProtocolDetails,
  GetPositionsInput,
  ProtocolPosition,
  GetConversionRateInput,
  ProtocolTokenUnderlyingRate,
  GetEventsInput,
  MovementsByBlock,
  GetTotalValueLockedInput,
  ProtocolTokenTvl,
  GetProfitsInput,
  ProfitsWithRange,
  GetApyInput,
  ProtocolTokenApy,
  GetAprInput,
  ProtocolTokenApr,
} from './adapter'
import { Erc20Metadata } from './erc20Metadata'

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

  /**
   * @remarks Returns high level metadata for the protocol
   *
   * @returns {ProtocolDetails} Object containing details about the protocol such as name and description.
   */
  getProtocolDetails(): ProtocolDetails

  /**
   * @remarks Returns array of pool tokens (lp tokens) for the protocol
   *
   * @returns {Promise<Erc20Metadata[]>} An array of objects detailing the protocol tokens.
   */
  getProtocolTokens(): Promise<Erc20Metadata[]>

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
   * @remarks Returns the user's profits made on open positions. Accepts blockNumber override.
   *
   * @param {GetProfitsInput} input - Object specifying user-address and the block range for the profit calculation.
   * @returns {Promise<ProfitsWithRange>} Object containing the starting and ending block numbers, and an array of objects detailing the profit information for each token.
   */
  getProfits(input: GetProfitsInput): Promise<ProfitsWithRange>

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
