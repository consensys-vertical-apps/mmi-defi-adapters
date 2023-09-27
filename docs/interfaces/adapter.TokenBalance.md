[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / TokenBalance

# Interface: TokenBalance

[adapter](../modules/adapter.md).TokenBalance

## Hierarchy

- [`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata)

  ↳ **`TokenBalance`**

  ↳↳ [`Underlying`](adapter.Underlying.md)

  ↳↳ [`ClaimableRewards`](adapter.ClaimableRewards.md)

  ↳↳ [`ProtocolPosition`](adapter.ProtocolPosition.md)

## Table of contents

### Properties

- [balanceRaw](adapter.TokenBalance.md#balanceraw)
- [balance](adapter.TokenBalance.md#balance)
- [address](adapter.TokenBalance.md#address)
- [name](adapter.TokenBalance.md#name)
- [symbol](adapter.TokenBalance.md#symbol)
- [decimals](adapter.TokenBalance.md#decimals)

## Properties

### balanceRaw

• **balanceRaw**: `bigint`

User's balance raw

#### Defined in

[adapter.ts:188](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L188)

___

### balance

• **balance**: `string`

User's balance formatted using token decimals

#### Defined in

[adapter.ts:192](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L192)

___

### address

• **address**: `string`

Token address

#### Inherited from

Erc20Metadata.address

#### Defined in

erc20Metadata.ts:5

___

### name

• **name**: `string`

Name of token

#### Inherited from

Erc20Metadata.name

#### Defined in

erc20Metadata.ts:10

___

### symbol

• **symbol**: `string`

Token symbol

#### Inherited from

Erc20Metadata.symbol

#### Defined in

erc20Metadata.ts:15

___

### decimals

• **decimals**: `number`

Token decimals

#### Inherited from

Erc20Metadata.decimals

#### Defined in

erc20Metadata.ts:20
