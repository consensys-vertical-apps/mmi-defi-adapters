import { Protocol } from '../adapters/protocols'
import { Chain } from '../core/constants/chains'
import { Erc20Metadata } from '../core/utils/getTokenMetadata'
import {
  ProtocolDetails,
  GetPositionsInput,
  ProtocolToken,
  GetPricesInput,
  ProtocolPricePerShareToken,
  GetEventsInput,
  MovementsByBlock,
  GetTotalValueLockedInput,
  ProtocolTotalValueLockedToken,
  GetProfitsInput,
  ProfitsTokensWithRange,
  GetApyInput,
  ProtocolApyToken,
  GetAprInput,
  ProtocolAprToken,
} from './adapter'

export interface IProtocolAdapter {
  /**
   * Unique identifier of the protocol
   */
  protocolId: Protocol

  /**
   * Unique identifier of the blockchain network
   */
  chainId: Chain

  /**
   * Returns details about the protocol such as name and description.
   * @returns An object containing:
   *  - `tokens`: An array of `ProtocolDetails` objects detailing the protocol.
   */
  getProtocolDetails(): ProtocolDetails

  /**
   * Returns an array of protocol tokens.
   * @returns A promise that resolves with an object containing:
   *  - `tokens`: An array of `Erc20Metadata` objects detailing the protocol tokens.
   */
  getProtocolTokens(): Promise<Erc20Metadata[]>

  /**
   * Returns array of positions for a given user-address.
   * @param input - The input parameters to get positions.
   * @returns A promise that resolves with an object containing:
   *  - `tokens`: An array of `ProtocolToken` objects detailing the positions.
   */
  getPositions(input: GetPositionsInput): Promise<ProtocolToken[]>

  /**
   * Returns the price per share of the protocol token (pool).
   * @param input - The input parameters to get price per share.
   * @returns A promise that resolves with an object containing:
   *  - `tokens`: An array of `ProtocolPricePerShareToken` objects detailing the price per share of the protocol token.
   */
  getPricePerShare(input: GetPricesInput): Promise<ProtocolPricePerShareToken>

  /**
   * Returns array of withdrawal events for a given user-address and given protocol-token-address (pool).
   * @param input - The input parameters to get withdrawals.
   * @returns A promise that resolves with an object containing:
   *  - `fromBlock`: The starting block number for the range.
   *  - `toBlock`: The ending block number for the range.
   *  - `tokens`: An array of `MovementsByBlock` objects detailing withdrawal events.
   */
  getWithdrawals(input: GetEventsInput): Promise<MovementsByBlock[]>

  /**
   * Returns array of deposit events for a given user-address and given protocol-token-address (pool).
   * @param input - The input parameters to get deposits.
   * @returns A promise that resolves with an object containing:
   *  - `fromBlock`: The starting block number for the range.
   *  - `toBlock`: The ending block number for the range.
   *  - `tokens`: An array of `MovementsByBlock` objects detailing deposit events.
   */
  getDeposits(input: GetEventsInput): Promise<MovementsByBlock[]>

  /**
   * Returns array of claimed reward events for a given user-address and given protocol-token-address (pool).
   * @param input - The input parameters to get claimed rewards.
   * @returns A promise that resolves with an object containing:
   *  - `fromBlock`: The starting block number for the range.
   *  - `toBlock`: The ending block number for the range.
   *  - `tokens`: An array of `MovementsByBlock` objects detailing claimed reward events.
   */
  getClaimedRewards(input: GetEventsInput): Promise<MovementsByBlock[]>

  /**
   * Returns an array of total value locked results in each protocol pool.
   * @param input - The input parameters to get total value locked.
   * @returns A promise that resolves with an object containing:
   *  - `tokens`: An array of `ProtocolTotalValueLockedToken` objects detailing the total value locked in each protocol pool.
   */
  getTotalValueLocked(
    input: GetTotalValueLockedInput,
  ): Promise<ProtocolTotalValueLockedToken[]>

  /**
   * Returns the profits made from the protocol within a specified block range.
   * The profit is calculated as the difference between the end position value and the start position value,
   * taking into account any deposits and withdrawals made within the block range.
   *
   * @param input - An object containing:
   *  - `userAddress`: The address of the user.
   *  - `fromBlock`: The starting block number for the range.
   *  - `toBlock`: The ending block number for the range.
   *
   * @returns A promise that resolves with an object containing:
   *  - `fromBlock`: The starting block number for the range.
   *  - `toBlock`: The ending block number for the range.
   *  - `tokens`: An array of `ProtocolProfitsToken` objects, each containing:
   *    - The token metadata.
   *    - The type of the token.
   *    - The profit made from the token, in raw and formatted form.
   *    - The calculation data used to calculate the profit, including the start and end position values, and the total deposits and withdrawals.
   */
  getProfits(input: GetProfitsInput): Promise<ProfitsTokensWithRange>

  /**
   * Returns an array of Annual Percentage Yield (APY) for each protocol pool not including reward APY.
   * @param input - The input parameters to get APY.
   * @returns A promise that resolves with an object containing:
   *  - `tokens`: An array of `ProtocolApyToken` objects detailing the Annual Percentage Yield for each protocol pool.
   */
  getApy(input: GetApyInput): Promise<ProtocolApyToken>

  /**
   * Returns an array of Reward Annual Percentage Yield (APY) for each protocol pool.
   * @param input - The input parameters to get APY.
   * @returns A promise that resolves with an object containing:
   *  - `tokens`: An array of `ProtocolApyToken` objects detailing the Annual Percentage Yield for each protocol pool.
   */
  getRewardApy?(input: GetApyInput): Promise<ProtocolApyToken>

  /**
   * Returns an array of Annual Percentage Rate (APR) for each protocol pool, not including reward APR.
   * @param input - The input parameters to get APR.
   * @returns A promise that resolves with an object containing:
   *  - `tokens`: An array of `ProtocolAprToken` objects detailing the Annual Percentage Rate for each protocol pool.
   */
  getApr(input: GetAprInput): Promise<ProtocolAprToken>

  /**
   * Returns an array of Reward Annual Percentage Rate (APR) for each protocol pool.
   * @param input - The input parameters to get APR.
   * @returns A promise that resolves with an object containing:
   *  - `tokens`: An array of `ProtocolAprToken` objects detailing the Annual Percentage Rate for each protocol pool.
   */
  getRewardApr?(input: GetAprInput): Promise<ProtocolAprToken>
}
