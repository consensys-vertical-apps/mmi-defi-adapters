[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / UnwrapExchangeRate

# Interface: UnwrapExchangeRate

[adapter](../modules/adapter.md).UnwrapExchangeRate

## Hierarchy

- [`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata)

  ↳ **`UnwrapExchangeRate`**

## Table of contents

### Properties

- [baseRate](adapter.UnwrapExchangeRate.md#baserate)
- [type](adapter.UnwrapExchangeRate.md#type)
- [tokens](adapter.UnwrapExchangeRate.md#tokens)
- [address](adapter.UnwrapExchangeRate.md#address)
- [name](adapter.UnwrapExchangeRate.md#name)
- [symbol](adapter.UnwrapExchangeRate.md#symbol)
- [decimals](adapter.UnwrapExchangeRate.md#decimals)

## Properties

### baseRate

• **baseRate**: ``1``

Always equal to 1
We are finding the underlying value of 1 LP token

#### Defined in

[adapter.ts:229](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L229)

___

### type

• **type**: ``"protocol"``

#### Defined in

[adapter.ts:230](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L230)

___

### tokens

• `Optional` **tokens**: [`UnderlyingTokenRate`](adapter.UnderlyingTokenRate.md)[]

#### Defined in

[adapter.ts:231](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L231)

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
