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
- [DisplayProtocolTokenUnderlyingRate](response.md#displayprotocoltokenunderlyingrate)
- [TotalValueLockResponse](response.md#totalvaluelockresponse)
- [DisplayProtocolTokenTvl](response.md#displayprotocoltokentvl)
- [DefiMovementsResponse](response.md#defimovementsresponse)
- [DisplayMovementsByBlock](response.md#displaymovementsbyblock)

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

[response.ts:17](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L17)

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

[response.ts:28](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L28)

___

### AdapterResponse

Ƭ **AdapterResponse**<`ProtocolResponse`\>: [`ProtocolDetails`](adapter.md#protocoldetails) & `ProtocolResponse` & { `success`: ``true``  } \| [`AdapterErrorResponse`](response.md#adaptererrorresponse) & { `success`: ``false``  } \| [`AdapterErrorResponse`](response.md#adaptererrorresponse) & { `success`: ``false``  }

#### Type parameters

| Name |
| :------ |
| `ProtocolResponse` |

#### Defined in

[response.ts:36](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L36)

___

### DefiPositionResponse

Ƭ **DefiPositionResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`DisplayPosition`](response.md#displayposition)<[`ProtocolPosition`](../interfaces/adapter.ProtocolPosition.md)\>[]  }\>

#### Defined in

[response.ts:44](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L44)

___

### DisplayPosition

Ƭ **DisplayPosition**<`PositionBalance`\>: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<`PositionBalance`, ``"tokens"``\> & { `balance`: `number` ; `tokens?`: [`DisplayPosition`](response.md#displayposition)<[`Underlying`](../interfaces/adapter.Underlying.md)\>[] ; `price`: `number` ; `priceRaw`: `never`  } & `PositionBalance`[``"type"``] extends typeof [`Underlying`](adapter.md#underlying) \| typeof [`UnderlyingClaimable`](adapter.md#underlyingclaimable) ? { `iconUrl`: `string`  } : [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )<`string`, `never`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `PositionBalance` | extends [`TokenBalance`](../interfaces/adapter.TokenBalance.md) & { `type`: [`TokenType`](adapter.md#tokentype) ; `tokens?`: [`Underlying`](../interfaces/adapter.Underlying.md)[]  } |

#### Defined in

[response.ts:48](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L48)

___

### DefiProfitsResponse

Ƭ **DefiProfitsResponse**: [`AdapterResponse`](response.md#adapterresponse)<[`ProfitsWithRange`](../interfaces/adapter.ProfitsWithRange.md)\>

#### Defined in

[response.ts:64](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L64)

___

### PricePerShareResponse

Ƭ **PricePerShareResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`DisplayProtocolTokenUnderlyingRate`](response.md#displayprotocoltokenunderlyingrate)[]  }\>

#### Defined in

[response.ts:66](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L66)

___

### DisplayProtocolTokenUnderlyingRate

Ƭ **DisplayProtocolTokenUnderlyingRate**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`ProtocolTokenUnderlyingRate`](../interfaces/adapter.ProtocolTokenUnderlyingRate.md), ``"tokens"``\> & { `tokens?`: [`UnderlyingTokenRate`](../interfaces/adapter.UnderlyingTokenRate.md) & { `underlyingRate`: `number` ; `iconUrl?`: `string`  }[]  }

#### Defined in

[response.ts:70](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L70)

___

### TotalValueLockResponse

Ƭ **TotalValueLockResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`DisplayProtocolTokenTvl`](response.md#displayprotocoltokentvl)[]  }\>

#### Defined in

[response.ts:80](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L80)

___

### DisplayProtocolTokenTvl

Ƭ **DisplayProtocolTokenTvl**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`ProtocolTokenTvl`](../interfaces/adapter.ProtocolTokenTvl.md), ``"tokens"``\> & { `totalSupply`: `number` ; `tokens?`: [`UnderlyingTokenTvl`](../interfaces/adapter.UnderlyingTokenTvl.md) & { `totalSupply`: `number` ; `iconUrl`: `string`  }[]  }

#### Defined in

[response.ts:84](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L84)

___

### DefiMovementsResponse

Ƭ **DefiMovementsResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `movements`: [`DisplayMovementsByBlock`](response.md#displaymovementsbyblock)[]  }\>

#### Defined in

[response.ts:89](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L89)

___

### DisplayMovementsByBlock

Ƭ **DisplayMovementsByBlock**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`MovementsByBlock`](../interfaces/adapter.MovementsByBlock.md), ``"tokens"``\> & { `tokens?`: [`Underlying`](../interfaces/adapter.Underlying.md) & { `balance`: `number`  }[]  }

#### Defined in

[response.ts:93](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L93)
