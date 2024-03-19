import { AddressLike, BigNumberish } from 'ethers'
import { Protocol } from '../adapters/protocols'

export const WriteActions = {
  Supply: 'supply',
  Withdraw: 'withdraw',
  Borrow: 'borrow',
  Repay: 'repay',
} as const
export type WriteActions = (typeof WriteActions)[keyof typeof WriteActions]

export type GetTransactionParamsInput =
  | {
      action: typeof WriteActions.Supply
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
      action: typeof WriteActions.Supply
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
