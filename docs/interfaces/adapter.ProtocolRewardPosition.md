[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / ProtocolRewardPosition

# Interface: ProtocolRewardPosition

[adapter](../modules/adapter.md).ProtocolRewardPosition

User's position, includes balance of protocol token related underlying token balances

## Hierarchy

- [`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata)

  ↳ **`ProtocolRewardPosition`**

## Table of contents

### Properties

- [type](adapter.ProtocolRewardPosition.md#type)
- [tokens](adapter.ProtocolRewardPosition.md#tokens)
- [address](adapter.ProtocolRewardPosition.md#address)
- [name](adapter.ProtocolRewardPosition.md#name)
- [symbol](adapter.ProtocolRewardPosition.md#symbol)
- [decimals](adapter.ProtocolRewardPosition.md#decimals)

## Properties

### type

• **type**: ``"protocol"``

#### Defined in

[adapter.ts:210](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L210)

___

### tokens

• `Optional` **tokens**: [`ClaimableRewards`](adapter.ClaimableRewards.md)[]

Underlying token balances

#### Defined in

[adapter.ts:215](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L215)

___

### address

• **address**: `string`

Token address

#### Inherited from

Erc20Metadata.address

#### Defined in

[erc20Metadata.ts:5](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L5)

___

### name

• **name**: `string`

Name of token

#### Inherited from

Erc20Metadata.name

#### Defined in

[erc20Metadata.ts:10](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L10)

___

### symbol

• **symbol**: `string`

Token symbol

#### Inherited from

Erc20Metadata.symbol

#### Defined in

[erc20Metadata.ts:15](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L15)

___

### decimals

• **decimals**: `number`

Token decimals

#### Inherited from

Erc20Metadata.decimals

#### Defined in

[erc20Metadata.ts:20](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L20)
