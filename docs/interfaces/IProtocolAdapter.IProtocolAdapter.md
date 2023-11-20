[@metamask-institutional/defi-adapters](../README.md) / [IProtocolAdapter](../modules/IProtocolAdapter.md) / IProtocolAdapter

# Interface: IProtocolAdapter

[IProtocolAdapter](../modules/IProtocolAdapter.md).IProtocolAdapter

## Table of contents

### Properties

- [protocolId](IProtocolAdapter.IProtocolAdapter.md#protocolid)
- [chainId](IProtocolAdapter.IProtocolAdapter.md#chainid)
- [productId](IProtocolAdapter.IProtocolAdapter.md#productid)

### Methods

- [getProtocolDetails](IProtocolAdapter.IProtocolAdapter.md#getprotocoldetails)
- [getProtocolTokens](IProtocolAdapter.IProtocolAdapter.md#getprotocoltokens)
- [getPositions](IProtocolAdapter.IProtocolAdapter.md#getpositions)
- [getProtocolTokenToUnderlyingTokenRate](IProtocolAdapter.IProtocolAdapter.md#getprotocoltokentounderlyingtokenrate)
- [getWithdrawals](IProtocolAdapter.IProtocolAdapter.md#getwithdrawals)
- [getDeposits](IProtocolAdapter.IProtocolAdapter.md#getdeposits)
- [getTotalValueLocked](IProtocolAdapter.IProtocolAdapter.md#gettotalvaluelocked)
- [getProfits](IProtocolAdapter.IProtocolAdapter.md#getprofits)
- [getApy](IProtocolAdapter.IProtocolAdapter.md#getapy)
- [getApr](IProtocolAdapter.IProtocolAdapter.md#getapr)

## Properties

### protocolId

• **protocolId**: `Protocol`

Unique identifier of the protocol.

#### Defined in

[IProtocolAdapter.ts:26](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L26)

___

### chainId

• **chainId**: `Chain`

Unique identifier of the blockchain network.

#### Defined in

[IProtocolAdapter.ts:31](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L31)

___

### productId

• **productId**: `string`

Unique identifier for this protocol adapter

#### Defined in

[IProtocolAdapter.ts:36](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L36)

## Methods

### getProtocolDetails

▸ **getProtocolDetails**(): [`ProtocolDetails`](../modules/adapter.md#protocoldetails)

#### Returns

[`ProtocolDetails`](../modules/adapter.md#protocoldetails)

Object containing details about the protocol such as name and description.

**`Remarks`**

Returns high level metadata for the protocol

#### Defined in

[IProtocolAdapter.ts:43](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L43)

___

### getProtocolTokens

▸ **getProtocolTokens**(): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata)[]\>

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata)[]\>

An array of objects detailing the protocol tokens.

**`Remarks`**

Returns array of pool tokens (lp tokens) for the protocol

#### Defined in

[IProtocolAdapter.ts:50](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L50)

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

[IProtocolAdapter.ts:59](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L59)

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

[IProtocolAdapter.ts:68](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L68)

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

[IProtocolAdapter.ts:79](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L79)

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

[IProtocolAdapter.ts:88](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L88)

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

[IProtocolAdapter.ts:97](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L97)

___

### getProfits

▸ **getProfits**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProfitsWithRange`](adapter.ProfitsWithRange.md)\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetProfitsInput`](adapter.GetProfitsInput.md) | Object specifying user-address and the block range for the profit calculation. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProfitsWithRange`](adapter.ProfitsWithRange.md)\>

Object containing the starting and ending block numbers, and an array of objects detailing the profit information for each token.

**`Remarks`**

Returns the user's profits made on open positions. Accepts blockNumber override.

#### Defined in

[IProtocolAdapter.ts:108](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L108)

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

[IProtocolAdapter.ts:117](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L117)

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

[IProtocolAdapter.ts:126](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L126)
