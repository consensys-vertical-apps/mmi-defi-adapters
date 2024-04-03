import type { GetTxParamsInput as AaveV3ATokenGetTxParamsInput } from '../adapters/aave-v3/products/a-token/aaveV3ATokenPoolAdapter'
import type { GetTxParamsInput as CompoundV2BorrowMarketGetTxParamsInput } from '../adapters/compound-v2/products/borrow-market/compoundV2BorrowMarketAdapter'
import type { GetTxParamsInput as CompoundV2SupplyMarketGetTxParamsInput } from '../adapters/compound-v2/products/supply-market/compoundV2SupplyMarketAdapter'

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

/**
 * Update manually (TODO: Update automatically by parsing the adapters for exported object called GetTxParamsInput)
 *
 * Developers define here your protocol's input structure for generating transaction parameters
 *
 * Each type must have an action, your protocolId and your productId and inputs related to your specific protocol action.
 */
export type GetTransactionParamsInput =
  | AaveV3ATokenGetTxParamsInput
  | CompoundV2BorrowMarketGetTxParamsInput
  | CompoundV2SupplyMarketGetTxParamsInput
