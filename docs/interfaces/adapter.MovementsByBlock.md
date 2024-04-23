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

[src/types/adapter.ts:235](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L235)

___

### tokens

• **tokens**: [`Underlying`](adapter.Underlying.md)[]

Movements in or out of a protocol position

#### Defined in

[src/types/adapter.ts:239](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L239)

___

### blockNumber

• **blockNumber**: `number`

Blocknumber movement was executed

#### Defined in

[src/types/adapter.ts:244](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L244)

___

### transactionHash

• **transactionHash**: `string`

#### Defined in

[src/types/adapter.ts:246](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L246)
