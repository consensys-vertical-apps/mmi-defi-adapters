[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / PositionProfits

# Interface: PositionProfits

[adapter](../modules/adapter.md).PositionProfits

## Hierarchy

- [`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata)

- [`UnderlyingProfitValues`](adapter.UnderlyingProfitValues.md)

  ↳ **`PositionProfits`**

## Table of contents

### Properties

- [profit](adapter.PositionProfits.md#profit)
- [performance](adapter.PositionProfits.md#performance)
- [calculationData](adapter.PositionProfits.md#calculationdata)
- [type](adapter.PositionProfits.md#type)
- [address](adapter.PositionProfits.md#address)
- [name](adapter.PositionProfits.md#name)
- [symbol](adapter.PositionProfits.md#symbol)
- [decimals](adapter.PositionProfits.md#decimals)

## Properties

### profit

• **profit**: `number`

Profit made in this token for this period

#### Inherited from

[UnderlyingProfitValues](adapter.UnderlyingProfitValues.md).[profit](adapter.UnderlyingProfitValues.md#profit)

#### Defined in

[adapter.ts:302](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L302)

___

### performance

• **performance**: `number`

#### Inherited from

[UnderlyingProfitValues](adapter.UnderlyingProfitValues.md).[performance](adapter.UnderlyingProfitValues.md#performance)

#### Defined in

[adapter.ts:304](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L304)

___

### calculationData

• **calculationData**: [`CalculationData`](adapter.CalculationData.md)

Numbers used to calculate profit value

#### Inherited from

[UnderlyingProfitValues](adapter.UnderlyingProfitValues.md).[calculationData](adapter.UnderlyingProfitValues.md#calculationdata)

#### Defined in

[adapter.ts:309](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L309)

___

### type

• **type**: ``"protocol"``

#### Defined in

[adapter.ts:313](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L313)

___

### address

• **address**: `string`

Token address

#### Inherited from

[UnderlyingProfitValues](adapter.UnderlyingProfitValues.md).[address](adapter.UnderlyingProfitValues.md#address)

#### Defined in

[erc20Metadata.ts:5](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L5)

___

### name

• **name**: `string`

Name of token

#### Inherited from

[UnderlyingProfitValues](adapter.UnderlyingProfitValues.md).[name](adapter.UnderlyingProfitValues.md#name)

#### Defined in

[erc20Metadata.ts:10](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L10)

___

### symbol

• **symbol**: `string`

Token symbol

#### Inherited from

[UnderlyingProfitValues](adapter.UnderlyingProfitValues.md).[symbol](adapter.UnderlyingProfitValues.md#symbol)

#### Defined in

[erc20Metadata.ts:15](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L15)

___

### decimals

• **decimals**: `number`

Token decimals

#### Inherited from

[UnderlyingProfitValues](adapter.UnderlyingProfitValues.md).[decimals](adapter.UnderlyingProfitValues.md#decimals)

#### Defined in

[erc20Metadata.ts:20](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L20)
