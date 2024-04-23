[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / UnderlyingProfitValues

# Interface: UnderlyingProfitValues

[adapter](../modules/adapter.md).UnderlyingProfitValues

## Hierarchy

- [`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata)

  ↳ **`UnderlyingProfitValues`**

  ↳↳ [`PositionProfits`](adapter.PositionProfits.md)

## Table of contents

### Properties

- [profit](adapter.UnderlyingProfitValues.md#profit)
- [performance](adapter.UnderlyingProfitValues.md#performance)
- [calculationData](adapter.UnderlyingProfitValues.md#calculationdata)
- [address](adapter.UnderlyingProfitValues.md#address)
- [name](adapter.UnderlyingProfitValues.md#name)
- [symbol](adapter.UnderlyingProfitValues.md#symbol)
- [decimals](adapter.UnderlyingProfitValues.md#decimals)

## Properties

### profit

• **profit**: `number`

Profit made in this token for this period

#### Defined in

[src/types/adapter.ts:294](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L294)

___

### performance

• **performance**: `number`

#### Defined in

[src/types/adapter.ts:296](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L296)

___

### calculationData

• **calculationData**: [`CalculationData`](adapter.CalculationData.md)

Numbers used to calculate profit value

#### Defined in

[src/types/adapter.ts:301](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L301)

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
