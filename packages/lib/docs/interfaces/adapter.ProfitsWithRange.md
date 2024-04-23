[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / ProfitsWithRange

# Interface: ProfitsWithRange

[adapter](../modules/adapter.md).ProfitsWithRange

## Table of contents

### Properties

- [fromBlock](adapter.ProfitsWithRange.md#fromblock)
- [toBlock](adapter.ProfitsWithRange.md#toblock)
- [tokens](adapter.ProfitsWithRange.md#tokens)
- [rawValues](adapter.ProfitsWithRange.md#rawvalues)

## Properties

### fromBlock

• **fromBlock**: `number`

Calculated profits from this block number

#### Defined in

[packages/lib/src/types/adapter.ts:271](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L271)

___

### toBlock

• **toBlock**: `number`

Calculated profits to this block number

#### Defined in

[packages/lib/src/types/adapter.ts:276](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L276)

___

### tokens

• **tokens**: [`PositionProfits`](adapter.PositionProfits.md)[]

Profits earned by user address

#### Defined in

[packages/lib/src/types/adapter.ts:280](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L280)

___

### rawValues

• `Optional` **rawValues**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rawEndPositionValues` | [`ProtocolPosition`](adapter.ProtocolPosition.md)[] |
| `rawStartPositionValues` | [`ProtocolPosition`](adapter.ProtocolPosition.md)[] |
| `rawWithdrawals` | [`MovementsByBlock`](adapter.MovementsByBlock.md)[] |
| `rawDeposits` | [`MovementsByBlock`](adapter.MovementsByBlock.md)[] |

#### Defined in

[packages/lib/src/types/adapter.ts:282](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L282)
