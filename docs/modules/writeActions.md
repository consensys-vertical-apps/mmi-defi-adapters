[@metamask-institutional/defi-adapters](../README.md) / writeActions

# Module: writeActions

## Table of contents

### Type Aliases

- [WriteActions](writeActions.md#writeactions-1)
- [WriteActionInputSchemas](writeActions.md#writeactioninputschemas)

### Variables

- [WriteActions](writeActions.md#writeactions)

## Type Aliases

### WriteActions

Ƭ **WriteActions**: typeof [`WriteActions`](writeActions.md#writeactions)[keyof typeof [`WriteActions`](writeActions.md#writeactions)]

#### Defined in

[src/types/writeActions.ts:13](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/writeActions.ts#L13)

[src/types/writeActions.ts:19](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/writeActions.ts#L19)

___

### WriteActionInputSchemas

Ƭ **WriteActionInputSchemas**: { [keyof in WriteActions]?: z.ZodObject<any\> }

#### Defined in

[src/types/writeActions.ts:21](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/writeActions.ts#L21)

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

[src/types/writeActions.ts:13](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/writeActions.ts#L13)

[src/types/writeActions.ts:19](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/writeActions.ts#L19)
