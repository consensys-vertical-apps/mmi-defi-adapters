[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / TokenTvl

# Interface: TokenTvl

[adapter](../modules/adapter.md).TokenTvl

## Hierarchy

- [`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata)

  ↳ **`TokenTvl`**

  ↳↳ [`UnderlyingTokenTvl`](adapter.UnderlyingTokenTvl.md)

  ↳↳ [`ProtocolTokenTvl`](adapter.ProtocolTokenTvl.md)

## Table of contents

### Properties

- [totalSupplyRaw](adapter.TokenTvl.md#totalsupplyraw)
- [address](adapter.TokenTvl.md#address)
- [name](adapter.TokenTvl.md#name)
- [symbol](adapter.TokenTvl.md#symbol)
- [decimals](adapter.TokenTvl.md#decimals)

## Properties

### totalSupplyRaw

• **totalSupplyRaw**: `bigint`

Total underlying token locked in pool raw

#### Defined in

[src/types/adapter.ts:253](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L253)

___

### address

• **address**: `string`

Token address

#### Inherited from

Erc20Metadata.address

#### Defined in

[src/types/erc20Metadata.ts:5](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L5)

___

### name

• **name**: `string`

Name of token

#### Inherited from

Erc20Metadata.name

#### Defined in

[src/types/erc20Metadata.ts:10](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L10)

___

### symbol

• **symbol**: `string`

Token symbol

#### Inherited from

Erc20Metadata.symbol

#### Defined in

[src/types/erc20Metadata.ts:15](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L15)

___

### decimals

• **decimals**: `number`

Token decimals

#### Inherited from

Erc20Metadata.decimals

#### Defined in

[src/types/erc20Metadata.ts:20](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L20)
