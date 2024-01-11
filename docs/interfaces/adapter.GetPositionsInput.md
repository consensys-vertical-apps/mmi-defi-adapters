[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / GetPositionsInput

# Interface: GetPositionsInput

[adapter](../modules/adapter.md).GetPositionsInput

## Table of contents

### Properties

- [userAddress](adapter.GetPositionsInput.md#useraddress)
- [blockNumber](adapter.GetPositionsInput.md#blocknumber)
- [protocolTokenAddresses](adapter.GetPositionsInput.md#protocoltokenaddresses)

## Properties

### userAddress

• **userAddress**: `string`

Address of the user can be any type of address EOA/Contract

#### Defined in

[adapter.ts:157](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L157)

___

### blockNumber

• `Optional` **blockNumber**: `number`

Optional override param

#### Defined in

[adapter.ts:162](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L162)

___

### protocolTokenAddresses

• `Optional` **protocolTokenAddresses**: `string`[]

Optional filter for pools that will be queried

#### Defined in

[adapter.ts:167](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L167)
