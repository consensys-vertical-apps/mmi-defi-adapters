[@metamask-institutional/defi-adapters](../README.md) / [adapter](../modules/adapter.md) / GetPositionsInputWithTokenAddresses

# Interface: GetPositionsInputWithTokenAddresses

[adapter](../modules/adapter.md).GetPositionsInputWithTokenAddresses

## Hierarchy

- [`GetPositionsInput`](adapter.GetPositionsInput.md)

  ↳ **`GetPositionsInputWithTokenAddresses`**

## Table of contents

### Properties

- [protocolTokenAddresses](adapter.GetPositionsInputWithTokenAddresses.md#protocoltokenaddresses)
- [userAddress](adapter.GetPositionsInputWithTokenAddresses.md#useraddress)
- [blockNumber](adapter.GetPositionsInputWithTokenAddresses.md#blocknumber)
- [tokenIds](adapter.GetPositionsInputWithTokenAddresses.md#tokenids)

## Properties

### protocolTokenAddresses

• **protocolTokenAddresses**: `string`[]

Optional filter for pools that will be queried

#### Overrides

[GetPositionsInput](adapter.GetPositionsInput.md).[protocolTokenAddresses](adapter.GetPositionsInput.md#protocoltokenaddresses)

#### Defined in

[adapter.ts:152](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L152)

___

### userAddress

• **userAddress**: `string`

Address of the user can be any type of address EOA/Contract

#### Inherited from

[GetPositionsInput](adapter.GetPositionsInput.md).[userAddress](adapter.GetPositionsInput.md#useraddress)

#### Defined in

[adapter.ts:159](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L159)

___

### blockNumber

• `Optional` **blockNumber**: `number`

Optional override param

#### Inherited from

[GetPositionsInput](adapter.GetPositionsInput.md).[blockNumber](adapter.GetPositionsInput.md#blocknumber)

#### Defined in

[adapter.ts:164](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L164)

___

### tokenIds

• `Optional` **tokenIds**: `string`[]

Optional filter for pools that will be queried by an ID

#### Inherited from

[GetPositionsInput](adapter.GetPositionsInput.md).[tokenIds](adapter.GetPositionsInput.md#tokenids)

#### Defined in

[adapter.ts:174](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L174)
