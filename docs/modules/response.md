[@metamask-institutional/defi-adapters](../README.md) / response

# Module: response

## Table of contents

### Type Aliases

- [GetEventsRequestInput](response.md#geteventsrequestinput)
- [AdapterErrorResponse](response.md#adaptererrorresponse)
- [AdapterResponse](response.md#adapterresponse)
- [DefiPositionResponse](response.md#defipositionresponse)
- [DisplayPosition](response.md#displayposition)
- [DefiProfitsResponse](response.md#defiprofitsresponse)
- [PricePerShareResponse](response.md#pricepershareresponse)
- [DisplayUnwrapExchangeRate](response.md#displayunwrapexchangerate)
- [TotalValueLockResponse](response.md#totalvaluelockresponse)
- [DisplayProtocolTokenTvl](response.md#displayprotocoltokentvl)
- [DisplayTokenTvl](response.md#displaytokentvl)
- [DefiMovementsResponse](response.md#defimovementsresponse)
- [DisplayMovementsByBlock](response.md#displaymovementsbyblock)
- [Support](response.md#support)

## Type Aliases

### GetEventsRequestInput

Ƭ **GetEventsRequestInput**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `userAddress` | `string` |
| `fromBlock` | `number` |
| `toBlock` | `number` |
| `protocolTokenAddress` | `string` |
| `protocolId` | `Protocol` |
| `chainId` | `Chain` |
| `productId` | `string` |
| `tokenId?` | `string` |

#### Defined in

[src/types/response.ts:18](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L18)

___

### AdapterErrorResponse

Ƭ **AdapterErrorResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `error` | { `message`: `string` ; `details?`: `any`  } |
| `error.message` | `string` |
| `error.details?` | `any` |

#### Defined in

[src/types/response.ts:29](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L29)

___

### AdapterResponse

Ƭ **AdapterResponse**<`ProtocolResponse`\>: [`ProtocolDetails`](adapter.md#protocoldetails) & `ProtocolResponse` & { `success`: ``true``  } \| [`AdapterErrorResponse`](response.md#adaptererrorresponse) & { `success`: ``false``  } \| [`AdapterErrorResponse`](response.md#adaptererrorresponse) & { `success`: ``false``  }

#### Type parameters

| Name |
| :------ |
| `ProtocolResponse` |

#### Defined in

[src/types/response.ts:37](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L37)

___

### DefiPositionResponse

Ƭ **DefiPositionResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`DisplayPosition`](response.md#displayposition)<[`ProtocolPosition`](../interfaces/adapter.ProtocolPosition.md)\>[]  }\>

#### Defined in

[src/types/response.ts:45](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L45)

___

### DisplayPosition

Ƭ **DisplayPosition**<`PositionBalance`\>: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<`PositionBalance`, ``"tokens"``\> & { `balance`: `number` ; `tokens?`: [`DisplayPosition`](response.md#displayposition)<[`Underlying`](../interfaces/adapter.Underlying.md)\>[] ; `price`: `number` ; `priceRaw`: `never`  } & `PositionBalance`[``"type"``] extends typeof [`Underlying`](adapter.md#underlying) \| typeof [`UnderlyingClaimable`](adapter.md#underlyingclaimable) ? { `iconUrl`: `string`  } : [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )<`string`, `never`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `PositionBalance` | extends [`TokenBalance`](../interfaces/adapter.TokenBalance.md) & { `type`: [`TokenType`](adapter.md#tokentype) ; `tokens?`: [`Underlying`](../interfaces/adapter.Underlying.md)[]  } |

#### Defined in

[src/types/response.ts:49](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L49)

___

### DefiProfitsResponse

Ƭ **DefiProfitsResponse**: [`AdapterResponse`](response.md#adapterresponse)<[`ProfitsWithRange`](../interfaces/adapter.ProfitsWithRange.md)\>

#### Defined in

[src/types/response.ts:65](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L65)

___

### PricePerShareResponse

Ƭ **PricePerShareResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`DisplayUnwrapExchangeRate`](response.md#displayunwrapexchangerate)[]  }\>

#### Defined in

[src/types/response.ts:67](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L67)

___

### DisplayUnwrapExchangeRate

Ƭ **DisplayUnwrapExchangeRate**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`UnwrapExchangeRate`](../interfaces/adapter.UnwrapExchangeRate.md), ``"tokens"``\> & { `tokens?`: [`UnwrappedTokenExchangeRate`](../interfaces/adapter.UnwrappedTokenExchangeRate.md) & { `underlyingRate`: `number` ; `iconUrl?`: `string`  }[]  }

#### Defined in

[src/types/response.ts:71](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L71)

___

### TotalValueLockResponse

Ƭ **TotalValueLockResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`DisplayTokenTvl`](response.md#displaytokentvl)<[`DisplayProtocolTokenTvl`](response.md#displayprotocoltokentvl)\>[]  }\>

#### Defined in

[src/types/response.ts:78](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L78)

___

### DisplayProtocolTokenTvl

Ƭ **DisplayProtocolTokenTvl**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`ProtocolTokenTvl`](../interfaces/adapter.ProtocolTokenTvl.md), ``"tokens"``\> & { `totalSupply`: `number` ; `tokens?`: [`UnderlyingTokenTvl`](../interfaces/adapter.UnderlyingTokenTvl.md) & { `totalSupply`: `number` ; `iconUrl`: `string`  }[]  }

#### Defined in

[src/types/response.ts:82](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L82)

___

### DisplayTokenTvl

Ƭ **DisplayTokenTvl**<`TokenTvlBalance`\>: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<`TokenTvlBalance`, ``"tokens"``\> & { `totalSupply`: `number` ; `tokens?`: [`DisplayTokenTvl`](response.md#displaytokentvl)<[`UnderlyingTokenTvl`](../interfaces/adapter.UnderlyingTokenTvl.md)\>[] ; `price`: `number` ; `priceRaw`: `never`  } & `TokenTvlBalance`[``"type"``] extends typeof [`Underlying`](adapter.md#underlying) ? { `iconUrl`: `string`  } : [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )<`string`, `never`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TokenTvlBalance` | extends [`TokenTvl`](../interfaces/adapter.TokenTvl.md) & { `type`: [`TokenType`](adapter.md#tokentype) ; `tokens?`: [`UnderlyingTokenTvl`](../interfaces/adapter.UnderlyingTokenTvl.md)[]  } |

#### Defined in

[src/types/response.ts:87](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L87)

___

### DefiMovementsResponse

Ƭ **DefiMovementsResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `movements`: [`DisplayMovementsByBlock`](response.md#displaymovementsbyblock)[]  }\>

#### Defined in

[src/types/response.ts:101](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L101)

___

### DisplayMovementsByBlock

Ƭ **DisplayMovementsByBlock**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`MovementsByBlock`](../interfaces/adapter.MovementsByBlock.md), ``"tokens"``\> & { `tokens?`: [`Underlying`](../interfaces/adapter.Underlying.md) & { `balance`: `number`  }[]  }

#### Defined in

[src/types/response.ts:105](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L105)

___

### Support

Ƭ **Support**: [`Partial`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype )<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )<`Protocol`, { `protocolDetails`: [`ProtocolDetails`](adapter.md#protocoldetails) ; `chains`: `Chain`[]  }[]\>\>

#### Defined in

[src/types/response.ts:109](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L109)
