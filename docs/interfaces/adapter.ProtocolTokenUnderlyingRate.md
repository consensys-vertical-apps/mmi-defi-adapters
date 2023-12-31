[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / ProtocolTokenUnderlyingRate

# Interface: ProtocolTokenUnderlyingRate

[adapter](../modules/adapter.md).ProtocolTokenUnderlyingRate

## Hierarchy

- [`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata)

  ↳ **`ProtocolTokenUnderlyingRate`**

## Table of contents

### Properties

- [baseRate](adapter.ProtocolTokenUnderlyingRate.md#baserate)
- [type](adapter.ProtocolTokenUnderlyingRate.md#type)
- [tokens](adapter.ProtocolTokenUnderlyingRate.md#tokens)
- [address](adapter.ProtocolTokenUnderlyingRate.md#address)
- [name](adapter.ProtocolTokenUnderlyingRate.md#name)
- [symbol](adapter.ProtocolTokenUnderlyingRate.md#symbol)
- [decimals](adapter.ProtocolTokenUnderlyingRate.md#decimals)

## Properties

### baseRate

• **baseRate**: ``1``

Always equal to 1
We are finding the underlying value of 1 LP token

#### Defined in

[adapter.ts:231](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L231)

___

### type

• **type**: ``"protocol"``

#### Defined in

[adapter.ts:232](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L232)

___

### tokens

• `Optional` **tokens**: [`UnderlyingTokenRate`](adapter.UnderlyingTokenRate.md)[]

#### Defined in

[adapter.ts:233](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L233)

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
