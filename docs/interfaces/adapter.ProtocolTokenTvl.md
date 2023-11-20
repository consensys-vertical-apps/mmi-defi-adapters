[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / ProtocolTokenTvl

# Interface: ProtocolTokenTvl

[adapter](../modules/adapter.md).ProtocolTokenTvl

## Hierarchy

- [`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata)

  ↳ **`ProtocolTokenTvl`**

## Table of contents

### Properties

- [type](adapter.ProtocolTokenTvl.md#type)
- [totalSupplyRaw](adapter.ProtocolTokenTvl.md#totalsupplyraw)
- [tokens](adapter.ProtocolTokenTvl.md#tokens)
- [address](adapter.ProtocolTokenTvl.md#address)
- [name](adapter.ProtocolTokenTvl.md#name)
- [symbol](adapter.ProtocolTokenTvl.md#symbol)
- [decimals](adapter.ProtocolTokenTvl.md#decimals)

## Properties

### type

• **type**: ``"protocol"``

#### Defined in

[adapter.ts:277](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L277)

___

### totalSupplyRaw

• **totalSupplyRaw**: `bigint`

Total underlying token locked in pool raw

#### Defined in

[adapter.ts:281](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L281)

___

### tokens

• `Optional` **tokens**: [`UnderlyingTokenTvl`](adapter.UnderlyingTokenTvl.md)[]

#### Defined in

[adapter.ts:282](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L282)

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
