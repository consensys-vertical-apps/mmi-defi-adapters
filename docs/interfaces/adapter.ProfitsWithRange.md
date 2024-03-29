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

[adapter.ts:270](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L270)

___

### toBlock

• **toBlock**: `number`

Calculated profits to this block number

#### Defined in

[adapter.ts:275](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L275)

___

### tokens

• **tokens**: [`PositionProfits`](adapter.PositionProfits.md)[]

Profits earned by user address

#### Defined in

[adapter.ts:279](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L279)

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

[adapter.ts:281](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L281)
