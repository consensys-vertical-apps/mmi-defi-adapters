[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / ProtocolTokenTvl

# Interface: ProtocolTokenTvl

[adapter](../modules/adapter.md).ProtocolTokenTvl

## Hierarchy

- [`TokenTvl`](adapter.TokenTvl.md)

  ↳ **`ProtocolTokenTvl`**

## Table of contents

### Properties

- [totalSupplyRaw](adapter.ProtocolTokenTvl.md#totalsupplyraw)
- [type](adapter.ProtocolTokenTvl.md#type)
- [tokens](adapter.ProtocolTokenTvl.md#tokens)
- [address](adapter.ProtocolTokenTvl.md#address)
- [name](adapter.ProtocolTokenTvl.md#name)
- [symbol](adapter.ProtocolTokenTvl.md#symbol)
- [decimals](adapter.ProtocolTokenTvl.md#decimals)

## Properties

### totalSupplyRaw

• **totalSupplyRaw**: `bigint`

Total underlying token locked in pool raw

#### Inherited from

[TokenTvl](adapter.TokenTvl.md).[totalSupplyRaw](adapter.TokenTvl.md#totalsupplyraw)

#### Defined in

[src/types/adapter.ts:253](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L253)

___

### type

• **type**: ``"protocol"``

#### Defined in

[src/types/adapter.ts:263](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L263)

___

### tokens

• `Optional` **tokens**: [`UnderlyingTokenTvl`](adapter.UnderlyingTokenTvl.md)[]

#### Defined in

[src/types/adapter.ts:264](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L264)

___

### address

• **address**: `string`

Token address

#### Inherited from

[TokenTvl](adapter.TokenTvl.md).[address](adapter.TokenTvl.md#address)

#### Defined in

[src/types/erc20Metadata.ts:5](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L5)

___

### name

• **name**: `string`

Name of token

#### Inherited from

[TokenTvl](adapter.TokenTvl.md).[name](adapter.TokenTvl.md#name)

#### Defined in

[src/types/erc20Metadata.ts:10](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L10)

___

### symbol

• **symbol**: `string`

Token symbol

#### Inherited from

[TokenTvl](adapter.TokenTvl.md).[symbol](adapter.TokenTvl.md#symbol)

#### Defined in

[src/types/erc20Metadata.ts:15](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L15)

___

### decimals

• **decimals**: `number`

Token decimals

#### Inherited from

[TokenTvl](adapter.TokenTvl.md).[decimals](adapter.TokenTvl.md#decimals)

#### Defined in

[src/types/erc20Metadata.ts:20](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L20)
