import { AddressLike, BigNumberish } from 'ethers'
import { Protocol } from '../adapters/protocols'

/**
 * Update manually
 *
 * Developers are encouraged to extend this object with new actions as needed, such as 'flashLoan',
 * 'supplyWithPermit', and others, to cover more specialized or advanced use cases.
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
 * Update manually
 *
 * Developers define here your protocol's input structure for generating transaction parameters
 *
 * Each type must have action, protocolId and productId and inputs related to your specific protocol action
 */
export type GetTransactionParamsInput =
  | {
      action: typeof WriteActions.Deposit
      protocolId: typeof Protocol.AaveV3
      productId: 'a-token'
      inputs: {
        asset: AddressLike
        amount: BigNumberish
        onBehalfOf: AddressLike
        referralCode: BigNumberish
      }
    }
  | {
      action: typeof WriteActions.Withdraw
      protocolId: typeof Protocol.AaveV3
      productId: 'a-token'
      inputs: {
        asset: string
        amount: BigNumberish
        to: string
      }
    }
  | {
      action: typeof WriteActions.Borrow
      protocolId: typeof Protocol.AaveV3
      productId: 'a-token'
      inputs: {
        asset: string
        amount: BigNumberish
        interestRateMode: BigNumberish
        referralCode: BigNumberish
        onBehalfOf: string
      }
    }
  | {
      action: typeof WriteActions.Repay
      protocolId: typeof Protocol.AaveV3
      productId: 'a-token'
      inputs: {
        asset: string
        amount: BigNumberish
        interestRateMode: BigNumberish
        onBehalfOf: string
      }
    }
  | {
      action: typeof WriteActions.Deposit
      protocolId: typeof Protocol.CompoundV2
      productId: 'supply-market'
      inputs: {
        asset: string
        amount: BigNumberish
      }
    }
  | {
      action: typeof WriteActions.Withdraw
      protocolId: typeof Protocol.CompoundV2
      productId: 'supply-market'
      inputs: {
        asset: string
        amount: BigNumberish
      }
    }
  | {
      action: typeof WriteActions.Borrow
      protocolId: typeof Protocol.CompoundV2
      productId: 'borrow-market'
      inputs: {
        asset: string
        amount: BigNumberish
      }
    }
  | {
      action: typeof WriteActions.Repay
      protocolId: typeof Protocol.CompoundV2
      productId: 'borrow-market'
      inputs: {
        asset: string
        amount: BigNumberish
      }
    }
