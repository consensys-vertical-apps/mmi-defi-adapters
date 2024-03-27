[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / MovementsByBlock

# Interface: MovementsByBlock

[adapter](../modules/adapter.md).MovementsByBlock

## Table of contents

### Properties

- [protocolToken](adapter.MovementsByBlock.md#protocoltoken)
- [tokens](adapter.MovementsByBlock.md#tokens)
- [blockNumber](adapter.MovementsByBlock.md#blocknumber)
- [transactionHash](adapter.MovementsByBlock.md#transactionhash)

## Properties

### protocolToken

• **protocolToken**: [`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata) & { `tokenId?`: `string`  }

#### Defined in

[adapter.ts:241](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L241)

___

### tokens

• **tokens**: [`Underlying`](adapter.Underlying.md)[]

Movements in or out of a protocol position

#### Defined in

[adapter.ts:245](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L245)

___

### blockNumber

• **blockNumber**: `number`

Blocknumber movement was executed

#### Defined in

[adapter.ts:250](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L250)

___

### transactionHash

• **transactionHash**: `string`

#### Defined in

[adapter.ts:252](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L252)
