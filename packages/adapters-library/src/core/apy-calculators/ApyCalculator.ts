import type { ProtocolPosition } from '../../types/adapter.js'
import type { Chain } from '../constants/chains.js'

/**
 * Data structure than contains the calculated APY,
 * and attaches various useful contextual information.
 */
export interface ApyCalculation {
  apyPercent: number
  apy: number
  aprPercent: number
  apr: number
  period: {
    blocknumberStart: number
    blocknumberEnd: number
    interestPercent: number
    interest: number
  }
  compounding: {
    durationDays: number
    frequency: number
  }
  protocolTokenAddress: string
}

export interface ApyCalculator<TArgs> {
  /**
   * Calculates the APY for a given user and protocol.
   *
   * @param {TArgs} args - The arguments specific to the APY calculation.
   * @returns {Promise<ApyCalculation>} A promise that resolves to an object representing the APY calculation.
   */
  getApy(args: TArgs): Promise<ApyCalculation>
}

export type EvmApyArgs = {
  positionStart: ProtocolPosition
  positionEnd: ProtocolPosition
  blocknumberStart: number
  blocknumberEnd: number
  protocolTokenAddress: string
  chainId: Chain
}
