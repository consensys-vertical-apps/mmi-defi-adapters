[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / UnderlyingTokenTvl

# Interface: UnderlyingTokenTvl

[adapter](../modules/adapter.md).UnderlyingTokenTvl

## Hierarchy

- [`TokenTvl`](adapter.TokenTvl.md)

  ↳ **`UnderlyingTokenTvl`**

## Table of contents

### Properties

- [totalSupplyRaw](adapter.UnderlyingTokenTvl.md#totalsupplyraw)
- [type](adapter.UnderlyingTokenTvl.md#type)
- [tokens](adapter.UnderlyingTokenTvl.md#tokens)
- [priceRaw](adapter.UnderlyingTokenTvl.md#priceraw)
- [address](adapter.UnderlyingTokenTvl.md#address)
- [name](adapter.UnderlyingTokenTvl.md#name)
- [symbol](adapter.UnderlyingTokenTvl.md#symbol)
- [decimals](adapter.UnderlyingTokenTvl.md#decimals)

## Properties

### totalSupplyRaw

• **totalSupplyRaw**: `bigint`

Total underlying token locked in pool raw

#### Inherited from

[TokenTvl](adapter.TokenTvl.md).[totalSupplyRaw](adapter.TokenTvl.md#totalsupplyraw)

#### Defined in

[packages/lib/src/types/adapter.ts:253](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L253)

___

### type

• **type**: ``"underlying"``

#### Defined in

[packages/lib/src/types/adapter.ts:257](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L257)

___

### tokens

• `Optional` **tokens**: [`UnderlyingTokenTvl`](adapter.UnderlyingTokenTvl.md)[]

#### Defined in

[packages/lib/src/types/adapter.ts:258](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L258)

___

### priceRaw

• `Optional` **priceRaw**: `bigint`

#### Defined in

[packages/lib/src/types/adapter.ts:259](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L259)

___

### address

• **address**: `string`

Token address

#### Inherited from

[TokenTvl](adapter.TokenTvl.md).[address](adapter.TokenTvl.md#address)

#### Defined in

[packages/lib/src/types/erc20Metadata.ts:5](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/erc20Metadata.ts#L5)

___

### name

• **name**: `string`

Name of token

#### Inherited from

[TokenTvl](adapter.TokenTvl.md).[name](adapter.TokenTvl.md#name)

#### Defined in

[packages/lib/src/types/erc20Metadata.ts:10](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/erc20Metadata.ts#L10)

___

### symbol

• **symbol**: `string`

Token symbol

#### Inherited from

[TokenTvl](adapter.TokenTvl.md).[symbol](adapter.TokenTvl.md#symbol)

#### Defined in

[packages/lib/src/types/erc20Metadata.ts:15](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/erc20Metadata.ts#L15)

___

### decimals

• **decimals**: `number`

Token decimals

#### Inherited from

[TokenTvl](adapter.TokenTvl.md).[decimals](adapter.TokenTvl.md#decimals)

#### Defined in

[packages/lib/src/types/erc20Metadata.ts:20](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/erc20Metadata.ts#L20)
