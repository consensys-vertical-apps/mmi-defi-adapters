[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / Underlying

# Interface: Underlying

[adapter](../modules/adapter.md).Underlying

Underlying token balances of a position
The underlying token may be a simple erc20 such as Dai.
Should the underlying token be another protocol token then we expect that to be resolved down into the underlying simple erc20 tokens

## Hierarchy

- [`TokenBalance`](adapter.TokenBalance.md)

  ↳ **`Underlying`**

## Table of contents

### Properties

- [balanceRaw](adapter.Underlying.md#balanceraw)
- [balance](adapter.Underlying.md#balance)
- [type](adapter.Underlying.md#type)
- [iconUrl](adapter.Underlying.md#iconurl)
- [tokens](adapter.Underlying.md#tokens)
- [address](adapter.Underlying.md#address)
- [name](adapter.Underlying.md#name)
- [symbol](adapter.Underlying.md#symbol)
- [decimals](adapter.Underlying.md#decimals)

## Properties

### balanceRaw

• **balanceRaw**: `bigint`

User's balance raw

#### Inherited from

[TokenBalance](adapter.TokenBalance.md).[balanceRaw](adapter.TokenBalance.md#balanceraw)

#### Defined in

[adapter.ts:188](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L188)

___

### balance

• **balance**: `string`

User's balance formatted using token decimals

#### Inherited from

[TokenBalance](adapter.TokenBalance.md).[balance](adapter.TokenBalance.md#balance)

#### Defined in

[adapter.ts:192](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L192)

___

### type

• **type**: ``"underlying"``

#### Defined in

[adapter.ts:201](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L201)

___

### iconUrl

• **iconUrl**: `string`

#### Defined in

[adapter.ts:202](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L202)

___

### tokens

• `Optional` **tokens**: [`Underlying`](adapter.Underlying.md)[]

#### Defined in

[adapter.ts:203](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L203)

___

### address

• **address**: `string`

Token address

#### Inherited from

[TokenBalance](adapter.TokenBalance.md).[address](adapter.TokenBalance.md#address)

#### Defined in

erc20Metadata.ts:5

___

### name

• **name**: `string`

Name of token

#### Inherited from

[TokenBalance](adapter.TokenBalance.md).[name](adapter.TokenBalance.md#name)

#### Defined in

erc20Metadata.ts:10

___

### symbol

• **symbol**: `string`

Token symbol

#### Inherited from

[TokenBalance](adapter.TokenBalance.md).[symbol](adapter.TokenBalance.md#symbol)

#### Defined in

erc20Metadata.ts:15

___

### decimals

• **decimals**: `number`

Token decimals

#### Inherited from

[TokenBalance](adapter.TokenBalance.md).[decimals](adapter.TokenBalance.md#decimals)

#### Defined in

erc20Metadata.ts:20
