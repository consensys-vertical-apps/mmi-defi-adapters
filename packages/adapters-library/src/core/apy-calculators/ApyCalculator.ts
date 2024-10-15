import { ProtocolPosition } from '../../types/adapter'
import { Chain } from '../constants/chains'

/**
 * Data structure than contains the calculated APY,
 * and attaches various useful contextual information.
 */
export interface ApyInfo {
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
}

/**
 * Whenever the APY calculation couldn't suceed.
 * For instance when no appropriate adapter was found,
 * or runtime error.
 */
export interface VoidApyInfo {
  apyPercent: null
  apy: null
  aprPercent: null
  apr: null
  period: {
    blocknumberStart: number
    blocknumberEnd: number
    interestPercent: null
    interest: null
  }
  compounding: {
    durationDays: null
    frequency: null
  }
}

export interface ApyCalculator {
  /**
   * Calculates the APY for a given user and protocol.
   *
   * @param {GetApyArgs} args - The arguments specific to the APY calculation.
   * @returns {Promise<ApyInfo>} A promise that resolves to an object representing the APY calculation.
   */
  getApy(args: GetApyArgs): Promise<ApyInfo | VoidApyInfo>
}

export type GetApyArgs = {
  protocolTokenStart: ProtocolPosition
  protocolTokenEnd: ProtocolPosition
  blocknumberStart: number
  blocknumberEnd: number
  protocolTokenAddress: string
  chainId: Chain
}
