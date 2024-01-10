[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / ProtocolPosition

# Interface: ProtocolPosition

[adapter](../modules/adapter.md).ProtocolPosition

User's position, includes balance of protocol token related underlying token balances

## Hierarchy

- [`TokenBalance`](adapter.TokenBalance.md)

  ↳ **`ProtocolPosition`**

## Table of contents

### Properties

- [balanceRaw](adapter.ProtocolPosition.md#balanceraw)
- [type](adapter.ProtocolPosition.md#type)
- [tokenId](adapter.ProtocolPosition.md#tokenid)
- [tokens](adapter.ProtocolPosition.md#tokens)
- [address](adapter.ProtocolPosition.md#address)
- [name](adapter.ProtocolPosition.md#name)
- [symbol](adapter.ProtocolPosition.md#symbol)
- [decimals](adapter.ProtocolPosition.md#decimals)

## Properties

### balanceRaw

• **balanceRaw**: `bigint`

User's balance raw

#### Inherited from

[TokenBalance](adapter.TokenBalance.md).[balanceRaw](adapter.TokenBalance.md#balanceraw)

#### Defined in

[adapter.ts:187](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L187)

___

### type

• **type**: ``"protocol"`` \| ``"claimable"``

#### Defined in

[adapter.ts:208](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L208)

___

### tokenId

• `Optional` **tokenId**: `string`

Used by NFT Defi Positions, e.g. uniswapV3

#### Defined in

[adapter.ts:213](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L213)

___

### tokens

• `Optional` **tokens**: [`Underlying`](adapter.Underlying.md)[]

Underlying token balances

#### Defined in

[adapter.ts:218](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L218)

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
