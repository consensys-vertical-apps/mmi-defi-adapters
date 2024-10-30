import {
  MovementsByBlock,
  TokenBalanceWithUnderlyings,
} from '../../types/adapter'
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

export interface ApyCalculator {
  /**
   * Calculates the APY for a given user and protocol.
   *
   * @param {GetApyArgs} args - The arguments specific to the APY calculation.
   * @returns {Promise<ApyInfo>} A promise that resolves to an object representing the APY calculation.
   */
  getApy(args: GetApyArgs): Promise<ApyInfo | undefined>
}

export type GetApyArgs = {
  protocolTokenStart: TokenBalanceWithUnderlyings
  protocolTokenEnd: TokenBalanceWithUnderlyings
  blocknumberStart: number
  blocknumberEnd: number
  protocolTokenAddress: string
  chainId: Chain
  withdrawals: MovementsByBlock[]
  deposits: MovementsByBlock[]
  repays: MovementsByBlock[]
  borrows: MovementsByBlock[]
}
