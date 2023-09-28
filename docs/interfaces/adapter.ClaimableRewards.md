[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / ClaimableRewards

# Interface: ClaimableRewards

[adapter](../modules/adapter.md).ClaimableRewards

Claimable rewards are mapped one to one to the underlying "reward" token
Therefore they always have a underlying-token which is the reward token

## Hierarchy

- [`TokenBalance`](adapter.TokenBalance.md)

  ↳ **`ClaimableRewards`**

## Table of contents

### Properties

- [balanceRaw](adapter.ClaimableRewards.md#balanceraw)
- [balance](adapter.ClaimableRewards.md#balance)
- [type](adapter.ClaimableRewards.md#type)
- [tokens](adapter.ClaimableRewards.md#tokens)
- [address](adapter.ClaimableRewards.md#address)
- [name](adapter.ClaimableRewards.md#name)
- [symbol](adapter.ClaimableRewards.md#symbol)
- [decimals](adapter.ClaimableRewards.md#decimals)

## Properties

### balanceRaw

• **balanceRaw**: `bigint`

User's balance raw

#### Inherited from

[TokenBalance](adapter.TokenBalance.md).[balanceRaw](adapter.TokenBalance.md#balanceraw)

#### Defined in

[adapter.ts:188](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L188)

___

### balance

• **balance**: `string`

User's balance formatted using token decimals

#### Inherited from

[TokenBalance](adapter.TokenBalance.md).[balance](adapter.TokenBalance.md#balance)

#### Defined in

[adapter.ts:192](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L192)

___

### type

• **type**: ``"claimable"``

#### Defined in

[adapter.ts:224](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L224)

___

### tokens

• **tokens**: [`Underlying`](adapter.Underlying.md)[]

#### Defined in

[adapter.ts:225](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L225)

___

### address

• **address**: `string`

Token address

#### Inherited from

[TokenBalance](adapter.TokenBalance.md).[address](adapter.TokenBalance.md#address)

#### Defined in

[erc20Metadata.ts:5](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L5)

___

### name

• **name**: `string`

Name of token

#### Inherited from

[TokenBalance](adapter.TokenBalance.md).[name](adapter.TokenBalance.md#name)

#### Defined in

[erc20Metadata.ts:10](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L10)

___

### symbol

• **symbol**: `string`

Token symbol

#### Inherited from

[TokenBalance](adapter.TokenBalance.md).[symbol](adapter.TokenBalance.md#symbol)

#### Defined in

[erc20Metadata.ts:15](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L15)

___

### decimals

• **decimals**: `number`

Token decimals

#### Inherited from

[TokenBalance](adapter.TokenBalance.md).[decimals](adapter.TokenBalance.md#decimals)

#### Defined in

[erc20Metadata.ts:20](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/erc20Metadata.ts#L20)
