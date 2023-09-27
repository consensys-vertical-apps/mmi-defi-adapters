[@metamask-institutional/defi-adapters](../README.md) / [iProtocolAdapter](../modules/iProtocolAdapter.md) / IProtocolAdapter

# Interface: IProtocolAdapter

[iProtocolAdapter](../modules/iProtocolAdapter.md).IProtocolAdapter

## Table of contents

### Properties

- [protocolId](iProtocolAdapter.IProtocolAdapter.md#protocolid)
- [chainId](iProtocolAdapter.IProtocolAdapter.md#chainid)

### Methods

- [getProtocolDetails](iProtocolAdapter.IProtocolAdapter.md#getprotocoldetails)
- [getProtocolTokens](iProtocolAdapter.IProtocolAdapter.md#getprotocoltokens)
- [getPositions](iProtocolAdapter.IProtocolAdapter.md#getpositions)
- [getClaimableRewards](iProtocolAdapter.IProtocolAdapter.md#getclaimablerewards)
- [getUnderlyingTokenRate](iProtocolAdapter.IProtocolAdapter.md#getunderlyingtokenrate)
- [getWithdrawals](iProtocolAdapter.IProtocolAdapter.md#getwithdrawals)
- [getDeposits](iProtocolAdapter.IProtocolAdapter.md#getdeposits)
- [getClaimedRewards](iProtocolAdapter.IProtocolAdapter.md#getclaimedrewards)
- [getTotalValueLocked](iProtocolAdapter.IProtocolAdapter.md#gettotalvaluelocked)
- [getProfits](iProtocolAdapter.IProtocolAdapter.md#getprofits)
- [getApy](iProtocolAdapter.IProtocolAdapter.md#getapy)
- [getRewardApy](iProtocolAdapter.IProtocolAdapter.md#getrewardapy)
- [getApr](iProtocolAdapter.IProtocolAdapter.md#getapr)
- [getRewardApr](iProtocolAdapter.IProtocolAdapter.md#getrewardapr)

## Properties

### protocolId

• **protocolId**: `Protocol`

Unique identifier of the protocol.

#### Defined in

iProtocolAdapter.ts:28

___

### chainId

• **chainId**: `Chain`

Unique identifier of the blockchain network.

#### Defined in

iProtocolAdapter.ts:33

## Methods

### getProtocolDetails

▸ **getProtocolDetails**(): [`ProtocolDetails`](../modules/adapter.md#protocoldetails)

#### Returns

[`ProtocolDetails`](../modules/adapter.md#protocoldetails)

Object containing details about the protocol such as name and description.

**`Remarks`**

Returns high level metadata for the protocol

#### Defined in

iProtocolAdapter.ts:40

___

### getProtocolTokens

▸ **getProtocolTokens**(): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata)[]\>

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata)[]\>

An array of objects detailing the protocol tokens.

**`Remarks`**

Returns array of pool tokens (lp tokens) for the protocol

#### Defined in

iProtocolAdapter.ts:47

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

iProtocolAdapter.ts:56

___

### getClaimableRewards

▸ **getClaimableRewards**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolRewardPosition`](adapter.ProtocolRewardPosition.md)[]\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetClaimableRewardsInput`](adapter.GetClaimableRewardsInput.md) | Object with user-address and optional blockNumber override. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolRewardPosition`](adapter.ProtocolRewardPosition.md)[]\>

An array of objects detailing the user positions.

**`Remarks`**

Returns array of claimable rewards owed to the user

#### Defined in

iProtocolAdapter.ts:65

___

### getUnderlyingTokenRate

▸ **getUnderlyingTokenRate**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolTokenUnderlyingRate`](adapter.ProtocolTokenUnderlyingRate.md)\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetPricesInput`](../modules/adapter.md#getpricesinput) | Object with protocol-token-address and optional blockNumber override. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolTokenUnderlyingRate`](adapter.ProtocolTokenUnderlyingRate.md)\>

Object detailing the price per share of the protocol token.

**`Remarks`**

Returns "price" of lp-tokens in the form of the underlying tokens

#### Defined in

iProtocolAdapter.ts:76

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

iProtocolAdapter.ts:87

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

iProtocolAdapter.ts:96

___

### getClaimedRewards

▸ **getClaimedRewards**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`MovementsByBlock`](adapter.MovementsByBlock.md)[]\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetEventsInput`](../modules/adapter.md#geteventsinput) | Object specifying user-address, protocol-token-address (pool), and the block range. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`MovementsByBlock`](adapter.MovementsByBlock.md)[]\>

Array of objects detailing claimed reward events within the specified block range.

**`Remarks`**

Returns the user's claimed rewards from a position

#### Defined in

iProtocolAdapter.ts:105

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

iProtocolAdapter.ts:114

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

iProtocolAdapter.ts:125

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

iProtocolAdapter.ts:134

___

### getRewardApy

▸ **getRewardApy**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolTokenApy`](adapter.ProtocolTokenApy.md)\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetApyInput`](../modules/adapter.md#getapyinput) | Object with protocol-token-address and optional blockNumber override. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolTokenApy`](adapter.ProtocolTokenApy.md)\>

Object detailing the Annual Percentage Yield, including rewards, for each protocol pool.

**`Remarks`**

Returns Apy made by the reward token(s) per pool

#### Defined in

iProtocolAdapter.ts:143

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

iProtocolAdapter.ts:152

___

### getRewardApr

▸ **getRewardApr**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolTokenApr`](adapter.ProtocolTokenApr.md)\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`GetAprInput`](../modules/adapter.md#getaprinput) | Object with protocol-token-address and optional blockNumber override. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`ProtocolTokenApr`](adapter.ProtocolTokenApr.md)\>

Object detailing the Annual Percentage Rate, including rewards, for each protocol pool.

**`Remarks`**

Returns reward Apr made per pool

#### Defined in

iProtocolAdapter.ts:161
