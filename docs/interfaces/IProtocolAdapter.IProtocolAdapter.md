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
- [getWithdrawals](IProtocolAdapter.IProtocolAdapter.md#getwithdrawals)
- [getDeposits](IProtocolAdapter.IProtocolAdapter.md#getdeposits)
- [getTotalValueLocked](IProtocolAdapter.IProtocolAdapter.md#gettotalvaluelocked)
- [getApy](IProtocolAdapter.IProtocolAdapter.md#getapy)
- [getApr](IProtocolAdapter.IProtocolAdapter.md#getapr)

## Properties

### protocolId

• **protocolId**: `Protocol`

Unique identifier of the protocol.

#### Defined in

[IProtocolAdapter.ts:25](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L25)

___

### chainId

• **chainId**: `Chain`

Unique identifier of the blockchain network.

#### Defined in

[IProtocolAdapter.ts:30](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L30)

___

### productId

• **productId**: `string`

Unique identifier for this protocol adapter

#### Defined in

[IProtocolAdapter.ts:35](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L35)

___

### adaptersController

• **adaptersController**: `AdaptersController`

#### Defined in

[IProtocolAdapter.ts:37](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L37)

## Methods

### getProtocolDetails

▸ **getProtocolDetails**(): [`ProtocolDetails`](../modules/adapter.md#protocoldetails)

#### Returns

[`ProtocolDetails`](../modules/adapter.md#protocoldetails)

Object containing details about the protocol such as name and description.

**`Remarks`**

Returns high level metadata for the protocol

#### Defined in

[IProtocolAdapter.ts:44](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L44)

___

### getProtocolTokens

▸ **getProtocolTokens**(): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata)[]\>

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata)[]\>

An array of objects detailing the protocol tokens.

**`Remarks`**

Returns array of pool tokens (lp tokens) for the protocol

#### Defined in

[IProtocolAdapter.ts:51](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L51)

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

[IProtocolAdapter.ts:60](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L60)

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

[IProtocolAdapter.ts:69](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L69)

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

[IProtocolAdapter.ts:80](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L80)

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

[IProtocolAdapter.ts:89](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L89)

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

[IProtocolAdapter.ts:98](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L98)

___

### getApy

▸ **getApy**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolTokenApy`](adapter.ProtocolTokenApy.md)\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetApyInput`](../modules/adapter.md#getapyinput) | Object with protocol-token-address and optional blockNumber override. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolTokenApy`](adapter.ProtocolTokenApy.md)\>

Object detailing the Annual Percentage Yield for each protocol pool without reward APY.

**`Remarks`**

Returns Apy per pool

#### Defined in

[IProtocolAdapter.ts:109](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L109)

___

### getApr

▸ **getApr**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolTokenApr`](adapter.ProtocolTokenApr.md)\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetAprInput`](../modules/adapter.md#getaprinput) | Object with protocol-token-address and optional blockNumber override. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolTokenApr`](adapter.ProtocolTokenApr.md)\>

Object detailing the Annual Percentage Rate without reward APR for each protocol pool.

**`Remarks`**

Returns Apr made per pool

#### Defined in

[IProtocolAdapter.ts:118](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L118)
