import type { z } from 'zod'

/**
 * Update manually
 *
 * Developers are encouraged to extend this object with new actions as needed, such as 'flashLoan',
 * 'supplyWithPermit', and others.
 *
 * Example additional actions:
 * - FlashLoan: 'flashLoan'
 * - SupplyWithPermit: 'supplyWithPermit'
 */
export const WriteActions = {
  Deposit: 'deposit',
  Withdraw: 'withdraw',
  Borrow: 'borrow',
  Repay: 'repay',
} as const
export type WriteActions = (typeof WriteActions)[keyof typeof WriteActions]

export type WriteActionInputSchemas = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [keyof in WriteActions]?: z.ZodObject<any>
}
