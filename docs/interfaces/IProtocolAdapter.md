[@metamask-institutional/defi-adapters](../README.md) / [Exports](../modules.md) / IProtocolAdapter

# Interface: IProtocolAdapter

## Table of contents

### Properties

- [protocolId](IProtocolAdapter.md#protocolid)
- [chainId](IProtocolAdapter.md#chainid)

### Methods

- [getProtocolDetails](IProtocolAdapter.md#getprotocoldetails)
- [getProtocolTokens](IProtocolAdapter.md#getprotocoltokens)
- [getPositions](IProtocolAdapter.md#getpositions)
- [getPricePerShare](IProtocolAdapter.md#getpricepershare)
- [getWithdrawals](IProtocolAdapter.md#getwithdrawals)
- [getDeposits](IProtocolAdapter.md#getdeposits)
- [getClaimedRewards](IProtocolAdapter.md#getclaimedrewards)
- [getTotalValueLocked](IProtocolAdapter.md#gettotalvaluelocked)
- [getProfits](IProtocolAdapter.md#getprofits)
- [getApy](IProtocolAdapter.md#getapy)
- [getRewardApy](IProtocolAdapter.md#getrewardapy)
- [getApr](IProtocolAdapter.md#getapr)
- [getRewardApr](IProtocolAdapter.md#getrewardapr)

## Properties

### protocolId

• **protocolId**: `Protocol`

Unique identifier of the protocol

#### Defined in

IProtocolAdapter.ts:26

___

### chainId

• **chainId**: `Chain`

Unique identifier of the blockchain network

#### Defined in

IProtocolAdapter.ts:31

## Methods

### getProtocolDetails

▸ **getProtocolDetails**(): `ProtocolDetails`

Returns details about the protocol such as name and description.

#### Returns

`ProtocolDetails`

An object containing:
 - `tokens`: An array of `ProtocolDetails` objects detailing the protocol.

#### Defined in

IProtocolAdapter.ts:38

___

### getProtocolTokens

▸ **getProtocolTokens**(): `Promise`<`Erc20Metadata`[]\>

Returns an array of protocol tokens.

#### Returns

`Promise`<`Erc20Metadata`[]\>

A promise that resolves with an object containing:
 - `tokens`: An array of `Erc20Metadata` objects detailing the protocol tokens.

#### Defined in

IProtocolAdapter.ts:45

___

### getPositions

▸ **getPositions**(`input`): `Promise`<`ProtocolToken`[]\>

Returns array of positions for a given user-address.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `GetPositionsInput` | The input parameters to get positions. |

#### Returns

`Promise`<`ProtocolToken`[]\>

A promise that resolves with an object containing:
 - `tokens`: An array of `ProtocolToken` objects detailing the positions.

#### Defined in

IProtocolAdapter.ts:53

___

### getPricePerShare

▸ **getPricePerShare**(`input`): `Promise`<`ProtocolPricePerShareToken`\>

Returns the price per share of the protocol token (pool).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `GetPricesInput` | The input parameters to get price per share. |

#### Returns

`Promise`<`ProtocolPricePerShareToken`\>

A promise that resolves with an object containing:
 - `tokens`: An array of `ProtocolPricePerShareToken` objects detailing the price per share of the protocol token.

#### Defined in

IProtocolAdapter.ts:61

___

### getWithdrawals

▸ **getWithdrawals**(`input`): `Promise`<`MovementsByBlock`[]\>

Returns array of withdrawal events for a given user-address and given protocol-token-address (pool).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `GetEventsInput` | The input parameters to get withdrawals. |

#### Returns

`Promise`<`MovementsByBlock`[]\>

A promise that resolves with an object containing:
 - `fromBlock`: The starting block number for the range.
 - `toBlock`: The ending block number for the range.
 - `tokens`: An array of `MovementsByBlock` objects detailing withdrawal events.

#### Defined in

IProtocolAdapter.ts:71

___

### getDeposits

▸ **getDeposits**(`input`): `Promise`<`MovementsByBlock`[]\>

Returns array of deposit events for a given user-address and given protocol-token-address (pool).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `GetEventsInput` | The input parameters to get deposits. |

#### Returns

`Promise`<`MovementsByBlock`[]\>

A promise that resolves with an object containing:
 - `fromBlock`: The starting block number for the range.
 - `toBlock`: The ending block number for the range.
 - `tokens`: An array of `MovementsByBlock` objects detailing deposit events.

#### Defined in

IProtocolAdapter.ts:81

___

### getClaimedRewards

▸ **getClaimedRewards**(`input`): `Promise`<`MovementsByBlock`[]\>

Returns array of claimed reward events for a given user-address and given protocol-token-address (pool).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `GetEventsInput` | The input parameters to get claimed rewards. |

#### Returns

`Promise`<`MovementsByBlock`[]\>

A promise that resolves with an object containing:
 - `fromBlock`: The starting block number for the range.
 - `toBlock`: The ending block number for the range.
 - `tokens`: An array of `MovementsByBlock` objects detailing claimed reward events.

#### Defined in

IProtocolAdapter.ts:91

___

### getTotalValueLocked

▸ **getTotalValueLocked**(`input`): `Promise`<`ProtocolTotalValueLockedToken`[]\>

Returns an array of total value locked results in each protocol pool.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `GetTotalValueLockedInput` | The input parameters to get total value locked. |

#### Returns

`Promise`<`ProtocolTotalValueLockedToken`[]\>

A promise that resolves with an object containing:
 - `tokens`: An array of `ProtocolTotalValueLockedToken` objects detailing the total value locked in each protocol pool.

#### Defined in

IProtocolAdapter.ts:99

___

### getProfits

▸ **getProfits**(`input`): `Promise`<`ProfitsTokensWithRange`\>

Returns the profits made from the protocol within a specified block range.
The profit is calculated as the difference between the end position value and the start position value,
taking into account any deposits and withdrawals made within the block range.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `GetProfitsInput` | An object containing: - `userAddress`: The address of the user. - `fromBlock`: The starting block number for the range. - `toBlock`: The ending block number for the range. |

#### Returns

`Promise`<`ProfitsTokensWithRange`\>

A promise that resolves with an object containing:
 - `fromBlock`: The starting block number for the range.
 - `toBlock`: The ending block number for the range.
 - `tokens`: An array of `ProtocolProfitsToken` objects, each containing:
   - The token metadata.
   - The type of the token.
   - The profit made from the token, in raw and formatted form.
   - The calculation data used to calculate the profit, including the start and end position values, and the total deposits and withdrawals.

#### Defined in

IProtocolAdapter.ts:122

___

### getApy

▸ **getApy**(`input`): `Promise`<`ProtocolApyToken`\>

Returns an array of Annual Percentage Yield (APY) for each protocol pool not including reward APY.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `GetApyInput` | The input parameters to get APY. |

#### Returns

`Promise`<`ProtocolApyToken`\>

A promise that resolves with an object containing:
 - `tokens`: An array of `ProtocolApyToken` objects detailing the Annual Percentage Yield for each protocol pool.

#### Defined in

IProtocolAdapter.ts:130

___

### getRewardApy

▸ `Optional` **getRewardApy**(`input`): `Promise`<`ProtocolApyToken`\>

Returns an array of Reward Annual Percentage Yield (APY) for each protocol pool.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `GetApyInput` | The input parameters to get APY. |

#### Returns

`Promise`<`ProtocolApyToken`\>

A promise that resolves with an object containing:
 - `tokens`: An array of `ProtocolApyToken` objects detailing the Annual Percentage Yield for each protocol pool.

#### Defined in

IProtocolAdapter.ts:138

___

### getApr

▸ **getApr**(`input`): `Promise`<`ProtocolAprToken`\>

Returns an array of Annual Percentage Rate (APR) for each protocol pool, not including reward APR.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `GetAprInput` | The input parameters to get APR. |

#### Returns

`Promise`<`ProtocolAprToken`\>

A promise that resolves with an object containing:
 - `tokens`: An array of `ProtocolAprToken` objects detailing the Annual Percentage Rate for each protocol pool.

#### Defined in

IProtocolAdapter.ts:146

___

### getRewardApr

▸ `Optional` **getRewardApr**(`input`): `Promise`<`ProtocolAprToken`\>

Returns an array of Reward Annual Percentage Rate (APR) for each protocol pool.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `GetAprInput` | The input parameters to get APR. |

#### Returns

`Promise`<`ProtocolAprToken`\>

A promise that resolves with an object containing:
 - `tokens`: An array of `ProtocolAprToken` objects detailing the Annual Percentage Rate for each protocol pool.

#### Defined in

IProtocolAdapter.ts:154
