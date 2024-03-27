[@metamask-institutional/defi-adapters](../README.md) / [IProtocolAdapter](../modules/IProtocolAdapter.md) / IProtocolAdapter

# Interface: IProtocolAdapter

[IProtocolAdapter](../modules/IProtocolAdapter.md).IProtocolAdapter

## Table of contents

### Properties

- [protocolId](IProtocolAdapter.IProtocolAdapter.md#protocolid)
- [chainId](IProtocolAdapter.IProtocolAdapter.md#chainid)
- [productId](IProtocolAdapter.IProtocolAdapter.md#productid)
- [adaptersController](IProtocolAdapter.IProtocolAdapter.md#adapterscontroller)

### Methods

- [getProtocolDetails](IProtocolAdapter.IProtocolAdapter.md#getprotocoldetails)
- [getProtocolTokens](IProtocolAdapter.IProtocolAdapter.md#getprotocoltokens)
- [getPositions](IProtocolAdapter.IProtocolAdapter.md#getpositions)
- [getProtocolTokenToUnderlyingTokenRate](IProtocolAdapter.IProtocolAdapter.md#getprotocoltokentounderlyingtokenrate)
- [getTransactionParams](IProtocolAdapter.IProtocolAdapter.md#gettransactionparams)
- [getWithdrawals](IProtocolAdapter.IProtocolAdapter.md#getwithdrawals)
- [getDeposits](IProtocolAdapter.IProtocolAdapter.md#getdeposits)
- [getBorrows](IProtocolAdapter.IProtocolAdapter.md#getborrows)
- [getRepays](IProtocolAdapter.IProtocolAdapter.md#getrepays)
- [getTotalValueLocked](IProtocolAdapter.IProtocolAdapter.md#gettotalvaluelocked)

## Properties

### protocolId

• **protocolId**: `Protocol`

Unique identifier of the protocol.

#### Defined in

[IProtocolAdapter.ts:22](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L22)

___

### chainId

• **chainId**: `Chain`

Unique identifier of the blockchain network.

#### Defined in

[IProtocolAdapter.ts:27](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L27)

___

### productId

• **productId**: `string`

Unique identifier for this protocol adapter

#### Defined in

[IProtocolAdapter.ts:32](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L32)

___

### adaptersController

• **adaptersController**: `AdaptersController`

#### Defined in

[IProtocolAdapter.ts:34](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L34)

## Methods

### getProtocolDetails

▸ **getProtocolDetails**(): [`ProtocolDetails`](../modules/adapter.md#protocoldetails)

#### Returns

[`ProtocolDetails`](../modules/adapter.md#protocoldetails)

Object containing details about the protocol such as name and description.

**`Remarks`**

Returns high level metadata for the protocol

#### Defined in

[IProtocolAdapter.ts:41](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L41)

___

### getProtocolTokens

▸ **getProtocolTokens**(): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata) & { `tokenId?`: `string`  }[]\>

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata) & { `tokenId?`: `string`  }[]\>

An array of objects detailing the protocol tokens.

**`Remarks`**

Returns array of pool tokens (lp tokens) for the protocol

#### Defined in

[IProtocolAdapter.ts:48](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L48)

___

### getPositions

▸ **getPositions**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolPosition`](adapter.ProtocolPosition.md)[]\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetPositionsInput`](adapter.GetPositionsInput.md) | Object with user-address and optional blockNumber override. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolPosition`](adapter.ProtocolPosition.md)[]\>

An array of objects detailing the user positions.

**`Remarks`**

Returns array of user positions opened in this protocol

#### Defined in

[IProtocolAdapter.ts:57](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L57)

___

### getProtocolTokenToUnderlyingTokenRate

▸ **getProtocolTokenToUnderlyingTokenRate**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolTokenUnderlyingRate`](adapter.ProtocolTokenUnderlyingRate.md)\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetConversionRateInput`](../modules/adapter.md#getconversionrateinput) | Object with protocol-token-address and optional blockNumber override. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolTokenUnderlyingRate`](adapter.ProtocolTokenUnderlyingRate.md)\>

Object detailing the price per share of the protocol token.

**`Remarks`**

Returns "price" of lp-tokens in the form of the underlying tokens

#### Defined in

[IProtocolAdapter.ts:66](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L66)

___

### getTransactionParams

▸ `Optional` **getTransactionParams**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<{ `to`: `string` ; `data`: `string`  }\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetTransactionParamsInput`](../modules/getTransactionParamsInput.md#gettransactionparamsinput) | tx input params |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<{ `to`: `string` ; `data`: `string`  }\>

transaction

**`Remarks`**

Returns tx params

#### Defined in

[IProtocolAdapter.ts:77](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L77)

___

### getWithdrawals

▸ **getWithdrawals**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`MovementsByBlock`](adapter.MovementsByBlock.md)[]\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetEventsInput`](../modules/adapter.md#geteventsinput) | Object specifying user-address, protocol-token-address (pool), and the block range. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`MovementsByBlock`](adapter.MovementsByBlock.md)[]\>

Array of objects detailing withdrawal events within the specified block range.

**`Remarks`**

Returns the user's withdrawals from a position

#### Defined in

[IProtocolAdapter.ts:88](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L88)

___

### getDeposits

▸ **getDeposits**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`MovementsByBlock`](adapter.MovementsByBlock.md)[]\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetEventsInput`](../modules/adapter.md#geteventsinput) | Object specifying user-address, protocol-token-address (pool), and the block range. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`MovementsByBlock`](adapter.MovementsByBlock.md)[]\>

Array of objects detailing deposit events within the specified block range.

**`Remarks`**

Returns the user's deposits to a position

#### Defined in

[IProtocolAdapter.ts:97](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L97)

___

### getBorrows

▸ `Optional` **getBorrows**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`MovementsByBlock`](adapter.MovementsByBlock.md)[]\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetEventsInput`](../modules/adapter.md#geteventsinput) | Object specifying user-address, protocol-token-address (pool), and the block range. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`MovementsByBlock`](adapter.MovementsByBlock.md)[]\>

Array of objects detailing withdrawal events within the specified block range.

**`Remarks`**

Returns the user's withdrawals from a position

#### Defined in

[IProtocolAdapter.ts:105](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L105)

___

### getRepays

▸ `Optional` **getRepays**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`MovementsByBlock`](adapter.MovementsByBlock.md)[]\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetEventsInput`](../modules/adapter.md#geteventsinput) | Object specifying user-address, protocol-token-address (pool), and the block range. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`MovementsByBlock`](adapter.MovementsByBlock.md)[]\>

Array of objects detailing deposit events within the specified block range.

**`Remarks`**

Returns the user's deposits to a position

#### Defined in

[IProtocolAdapter.ts:114](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L114)

___

### getTotalValueLocked

▸ **getTotalValueLocked**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolTokenTvl`](adapter.ProtocolTokenTvl.md)[]\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetTotalValueLockedInput`](adapter.GetTotalValueLockedInput.md) | Object with optional blockNumber override. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolTokenTvl`](adapter.ProtocolTokenTvl.md)[]\>

An array of objects detailing the total value locked in each protocol pool.

**`Remarks`**

Returns the Tvl per pool defined in the underlying token

#### Defined in

[IProtocolAdapter.ts:123](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L123)
