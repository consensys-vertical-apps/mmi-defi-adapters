[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / MovementsByBlock

# Interface: MovementsByBlock

[adapter](../modules/adapter.md).MovementsByBlock

## Table of contents

### Properties

- [protocolToken](adapter.MovementsByBlock.md#protocoltoken)
- [underlyingTokensMovement](adapter.MovementsByBlock.md#underlyingtokensmovement)
- [blockNumber](adapter.MovementsByBlock.md#blocknumber)

## Properties

### protocolToken

• **protocolToken**: [`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata) & { `tokenId?`: `string`  }

#### Defined in

[adapter.ts:272](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L272)

___

### underlyingTokensMovement

• **underlyingTokensMovement**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )<`string`, [`BaseTokenMovement`](adapter.BaseTokenMovement.md)\>

Movements in or out of a protocol position

#### Defined in

[adapter.ts:276](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L276)

___

### blockNumber

• **blockNumber**: `number`

Blocknumber movement was executed

#### Defined in

[adapter.ts:281](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L281)
