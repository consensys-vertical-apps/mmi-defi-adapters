[@metamask-institutional/defi-adapters](../README.md) / getTransactionParamsInput

# Module: getTransactionParamsInput

## Table of contents

### Type Aliases

- [WriteActions](getTransactionParamsInput.md#writeactions-1)
- [GetTransactionParamsInput](getTransactionParamsInput.md#gettransactionparamsinput)

### Variables

- [WriteActions](getTransactionParamsInput.md#writeactions)

## Type Aliases

### WriteActions

Ƭ **WriteActions**: typeof [`WriteActions`](getTransactionParamsInput.md#writeactions)[keyof typeof [`WriteActions`](getTransactionParamsInput.md#writeactions)]

#### Defined in

[getTransactionParamsInput.ts:14](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/getTransactionParamsInput.ts#L14)

[getTransactionParamsInput.ts:20](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/getTransactionParamsInput.ts#L20)

___

### GetTransactionParamsInput

Ƭ **GetTransactionParamsInput**: { `action`: typeof [`Deposit`](getTransactionParamsInput.md#deposit) ; `protocolId`: typeof `Protocol.AaveV3` ; `productId`: ``"a-token"`` ; `inputs`: { `asset`: `AddressLike` ; `amount`: `BigNumberish` ; `onBehalfOf`: `AddressLike` ; `referralCode`: `BigNumberish`  }  } \| { `action`: typeof [`Withdraw`](getTransactionParamsInput.md#withdraw) ; `protocolId`: typeof `Protocol.AaveV3` ; `productId`: ``"a-token"`` ; `inputs`: { `asset`: `string` ; `amount`: `BigNumberish` ; `to`: `string`  }  } \| { `action`: typeof [`Borrow`](getTransactionParamsInput.md#borrow) ; `protocolId`: typeof `Protocol.AaveV3` ; `productId`: ``"a-token"`` ; `inputs`: { `asset`: `string` ; `amount`: `BigNumberish` ; `interestRateMode`: `BigNumberish` ; `referralCode`: `BigNumberish` ; `onBehalfOf`: `string`  }  } \| { `action`: typeof [`Repay`](getTransactionParamsInput.md#repay) ; `protocolId`: typeof `Protocol.AaveV3` ; `productId`: ``"a-token"`` ; `inputs`: { `asset`: `string` ; `amount`: `BigNumberish` ; `interestRateMode`: `BigNumberish` ; `onBehalfOf`: `string`  }  } \| { `action`: typeof [`Deposit`](getTransactionParamsInput.md#deposit) ; `protocolId`: typeof `Protocol.CompoundV2` ; `productId`: ``"supply-market"`` ; `inputs`: { `asset`: `string` ; `amount`: `BigNumberish`  }  } \| { `action`: typeof [`Withdraw`](getTransactionParamsInput.md#withdraw) ; `protocolId`: typeof `Protocol.CompoundV2` ; `productId`: ``"supply-market"`` ; `inputs`: { `asset`: `string` ; `amount`: `BigNumberish`  }  } \| { `action`: typeof [`Borrow`](getTransactionParamsInput.md#borrow) ; `protocolId`: typeof `Protocol.CompoundV2` ; `productId`: ``"borrow-market"`` ; `inputs`: { `asset`: `string` ; `amount`: `BigNumberish`  }  } \| { `action`: typeof [`Repay`](getTransactionParamsInput.md#repay) ; `protocolId`: typeof `Protocol.CompoundV2` ; `productId`: ``"borrow-market"`` ; `inputs`: { `asset`: `string` ; `amount`: `BigNumberish`  }  }

Update manually

Developers define here your protocol's input structure for generating transaction parameters

Each type must have an action, your protocolId and your productId and inputs related to your specific protocol action.

#### Defined in

[getTransactionParamsInput.ts:29](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/getTransactionParamsInput.ts#L29)

## Variables

### WriteActions

• `Const` **WriteActions**: `Object`

Update manually

Developers are encouraged to extend this object with new actions as needed, such as 'flashLoan',
'supplyWithPermit', and others.

Example additional actions:
- FlashLoan: 'flashLoan'
- SupplyWithPermit: 'supplyWithPermit'

#### Type declaration

| Name | Type |
| :------ | :------ |
| `Deposit` | ``"deposit"`` |
| `Withdraw` | ``"withdraw"`` |
| `Borrow` | ``"borrow"`` |
| `Repay` | ``"repay"`` |

#### Defined in

[getTransactionParamsInput.ts:14](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/getTransactionParamsInput.ts#L14)

[getTransactionParamsInput.ts:20](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/getTransactionParamsInput.ts#L20)
