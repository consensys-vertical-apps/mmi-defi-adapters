[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / GetPositionsInput

# Interface: GetPositionsInput

[adapter](../modules/adapter.md).GetPositionsInput

## Hierarchy

- **`GetPositionsInput`**

  ↳ [`GetPositionsInputWithTokenAddresses`](adapter.GetPositionsInputWithTokenAddresses.md)

## Table of contents

### Properties

- [userAddress](adapter.GetPositionsInput.md#useraddress)
- [blockNumber](adapter.GetPositionsInput.md#blocknumber)
- [protocolTokenAddresses](adapter.GetPositionsInput.md#protocoltokenaddresses)
- [tokenIds](adapter.GetPositionsInput.md#tokenids)

## Properties

### userAddress

• **userAddress**: `string`

Address of the user can be any type of address EOA/Contract

#### Defined in

[adapter.ts:159](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L159)

___

### blockNumber

• `Optional` **blockNumber**: `number`

Optional override param

#### Defined in

[adapter.ts:164](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L164)

___

### protocolTokenAddresses

• `Optional` **protocolTokenAddresses**: `string`[]

Optional filter for pools that will be queried

#### Defined in

[adapter.ts:169](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L169)

___

### tokenIds

• `Optional` **tokenIds**: `string`[]

Optional filter for pools that will be queried by an ID

#### Defined in

[adapter.ts:174](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L174)
