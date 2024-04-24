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
- [unwrap](IProtocolAdapter.IProtocolAdapter.md#unwrap)
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

[src/types/IProtocolAdapter.ts:22](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L22)

___

### chainId

• **chainId**: `Chain`

Unique identifier of the blockchain network.

#### Defined in

[src/types/IProtocolAdapter.ts:27](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L27)

___

### productId

• **productId**: `string`

Unique identifier for this protocol adapter

#### Defined in

[src/types/IProtocolAdapter.ts:32](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L32)

___

### adaptersController

• **adaptersController**: `AdaptersController`

#### Defined in

[src/types/IProtocolAdapter.ts:34](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L34)

## Methods

### getProtocolDetails

▸ **getProtocolDetails**(): [`ProtocolDetails`](../modules/adapter.md#protocoldetails)

#### Returns

[`ProtocolDetails`](../modules/adapter.md#protocoldetails)

Object containing details about the protocol such as name and description.

**`Remarks`**

Returns high level metadata for the protocol

#### Defined in

[src/types/IProtocolAdapter.ts:41](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L41)

___

### getProtocolTokens

▸ **getProtocolTokens**(): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata) & { `tokenId?`: `string`  }[]\>

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`Erc20Metadata`](../modules/erc20Metadata.md#erc20metadata) & { `tokenId?`: `string`  }[]\>

An array of objects detailing the protocol tokens.

**`Remarks`**

Returns array of pool tokens (lp tokens) for the protocol

#### Defined in

[src/types/IProtocolAdapter.ts:48](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L48)

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

[src/types/IProtocolAdapter.ts:57](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L57)

___

### unwrap

▸ **unwrap**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`UnwrapExchangeRate`](adapter.UnwrapExchangeRate.md)\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | [`UnwrapInput`](../modules/adapter.md#unwrapinput) | Object with protocol-token-address and optional blockNumber override. |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<[`UnwrapExchangeRate`](adapter.UnwrapExchangeRate.md)\>

Object detailing the price per share of the protocol token.

**`Remarks`**

Returns "price" of lp-tokens in the form of the underlying tokens. Unwraps tokens to the current unwrapping exchange rate

#### Defined in

[src/types/IProtocolAdapter.ts:67](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L67)

___

### getTransactionParams

▸ `Optional` **getTransactionParams**(`input`): [`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<{ `to`: `string` ; `data`: `string`  }\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | { `protocolId`: ``"aave-v3"`` ; `productId`: ``"a-token"`` ; `chainId`: ``1`` \| ``10`` \| ``56`` \| ``137`` \| ``250`` \| ``8453`` \| ``42161`` \| ``43114`` \| ``59144`` ; `action`: ``"deposit"`` ; `inputs`: { asset: string; amount: string; onBehalfOf: string; referralCode: number; }  } \| { `protocolId`: ``"aave-v3"`` ; `productId`: ``"a-token"`` ; `chainId`: ``1`` \| ``10`` \| ``56`` \| ``137`` \| ``250`` \| ``8453`` \| ``42161`` \| ``43114`` \| ``59144`` ; `action`: ``"withdraw"`` ; `inputs`: { to: string; asset: string; amount: string; }  } \| { `protocolId`: ``"aave-v3"`` ; `productId`: ``"a-token"`` ; `chainId`: ``1`` \| ``10`` \| ``56`` \| ``137`` \| ``250`` \| ``8453`` \| ``42161`` \| ``43114`` \| ``59144`` ; `action`: ``"borrow"`` ; `inputs`: { asset: string; amount: string; onBehalfOf: string; referralCode: number; interestRateMode: number; }  } \| { `protocolId`: ``"aave-v3"`` ; `productId`: ``"a-token"`` ; `chainId`: ``1`` \| ``10`` \| ``56`` \| ``137`` \| ``250`` \| ``8453`` \| ``42161`` \| ``43114`` \| ``59144`` ; `action`: ``"repay"`` ; `inputs`: { asset: string; amount: string; onBehalfOf: string; interestRateMode: number; }  } \| { `protocolId`: ``"compound-v2"`` ; `productId`: ``"supply-market"`` ; `chainId`: ``1`` \| ``10`` \| ``56`` \| ``137`` \| ``250`` \| ``8453`` \| ``42161`` \| ``43114`` \| ``59144`` ; `action`: ``"deposit"`` ; `inputs`: { asset: string; amount: string; }  } \| { `protocolId`: ``"compound-v2"`` ; `productId`: ``"supply-market"`` ; `chainId`: ``1`` \| ``10`` \| ``56`` \| ``137`` \| ``250`` \| ``8453`` \| ``42161`` \| ``43114`` \| ``59144`` ; `action`: ``"withdraw"`` ; `inputs`: { asset: string; amount: string; }  } \| { `protocolId`: ``"compound-v2"`` ; `productId`: ``"borrow-market"`` ; `chainId`: ``1`` \| ``10`` \| ``56`` \| ``137`` \| ``250`` \| ``8453`` \| ``42161`` \| ``43114`` \| ``59144`` ; `action`: ``"borrow"`` ; `inputs`: { asset: string; amount: string; }  } \| { `protocolId`: ``"compound-v2"`` ; `productId`: ``"borrow-market"`` ; `chainId`: ``1`` \| ``10`` \| ``56`` \| ``137`` \| ``250`` \| ``8453`` \| ``42161`` \| ``43114`` \| ``59144`` ; `action`: ``"repay"`` ; `inputs`: { asset: string; amount: string; }  } | tx input params |

#### Returns

[`Promise`]( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise )<{ `to`: `string` ; `data`: `string`  }\>

transaction

**`Remarks`**

Returns tx params

#### Defined in

[src/types/IProtocolAdapter.ts:76](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L76)

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

[src/types/IProtocolAdapter.ts:87](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L87)

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

[src/types/IProtocolAdapter.ts:96](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L96)

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

[src/types/IProtocolAdapter.ts:104](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L104)

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

[src/types/IProtocolAdapter.ts:113](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L113)

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

[src/types/IProtocolAdapter.ts:122](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/IProtocolAdapter.ts#L122)
