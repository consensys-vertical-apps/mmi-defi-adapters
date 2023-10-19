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
- [DisplayProfitsWithRange](response.md#displayprofitswithrange)
- [PricePerShareResponse](response.md#pricepershareresponse)
- [DisplayProtocolTokenUnderlyingRate](response.md#displayprotocoltokenunderlyingrate)
- [APRResponse](response.md#aprresponse)
- [APYResponse](response.md#apyresponse)
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
| `product` | `string` |
| `tokenId?` | `string` |

#### Defined in

[response.ts:22](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L22)

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

[response.ts:33](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L33)

___

### AdapterResponse

Ƭ **AdapterResponse**<`ProtocolResponse`\>: [`ProtocolDetails`](adapter.md#protocoldetails) & `ProtocolResponse` & { `success`: ``true``  } \| [`AdapterErrorResponse`](response.md#adaptererrorresponse) & { `success`: ``false``  } \| [`AdapterErrorResponse`](response.md#adaptererrorresponse) & { `success`: ``false``  }

#### Type parameters

| Name |
| :------ |
| `ProtocolResponse` |

#### Defined in

[response.ts:41](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L41)

___

### DefiPositionResponse

Ƭ **DefiPositionResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`DisplayPosition`](response.md#displayposition)<[`ProtocolPosition`](../interfaces/adapter.ProtocolPosition.md)\>[]  }\>

#### Defined in

[response.ts:49](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L49)

___

### DisplayPosition

Ƭ **DisplayPosition**<`PositionBalance`\>: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<`PositionBalance`, ``"tokens"``\> & { `balance`: `string` ; `tokens?`: [`DisplayPosition`](response.md#displayposition)<[`Underlying`](../interfaces/adapter.Underlying.md)\>[]  } & `PositionBalance`[``"type"``] extends typeof [`Underlying`](adapter.md#underlying) \| typeof [`UnderlyingClaimableFee`](adapter.md#underlyingclaimablefee) ? { `iconUrl`: `string`  } : [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )<`string`, `never`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `PositionBalance` | extends [`TokenBalance`](../interfaces/adapter.TokenBalance.md) & { `type`: [`TokenType`](adapter.md#tokentype) ; `tokens?`: [`Underlying`](../interfaces/adapter.Underlying.md)[]  } |

#### Defined in

[response.ts:53](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L53)

___

### DefiProfitsResponse

Ƭ **DefiProfitsResponse**: [`AdapterResponse`](response.md#adapterresponse)<[`DisplayProfitsWithRange`](response.md#displayprofitswithrange)\>

#### Defined in

[response.ts:67](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L67)

___

### DisplayProfitsWithRange

Ƭ **DisplayProfitsWithRange**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`ProfitsWithRange`](../interfaces/adapter.ProfitsWithRange.md), ``"tokens"``\> & { `tokens`: `DisplayPositionProfits`[]  }

#### Defined in

[response.ts:69](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L69)

___

### PricePerShareResponse

Ƭ **PricePerShareResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`DisplayProtocolTokenUnderlyingRate`](response.md#displayprotocoltokenunderlyingrate)[]  }\>

#### Defined in

[response.ts:77](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L77)

___

### DisplayProtocolTokenUnderlyingRate

Ƭ **DisplayProtocolTokenUnderlyingRate**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`ProtocolTokenUnderlyingRate`](../interfaces/adapter.ProtocolTokenUnderlyingRate.md), ``"tokens"``\> & { `tokens?`: [`UnderlyingTokenRate`](../interfaces/adapter.UnderlyingTokenRate.md) & { `underlyingRate`: `string` ; `iconUrl`: `string`  }[]  }

#### Defined in

[response.ts:81](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L81)

___

### APRResponse

Ƭ **APRResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`ProtocolTokenApr`](../interfaces/adapter.ProtocolTokenApr.md)[]  }\>

#### Defined in

[response.ts:88](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L88)

___

### APYResponse

Ƭ **APYResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`ProtocolTokenApy`](../interfaces/adapter.ProtocolTokenApy.md)[]  }\>

#### Defined in

[response.ts:92](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L92)

___

### TotalValueLockResponse

Ƭ **TotalValueLockResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`DisplayProtocolTokenTvl`](response.md#displayprotocoltokentvl)[]  }\>

#### Defined in

[response.ts:96](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L96)

___

### DisplayProtocolTokenTvl

Ƭ **DisplayProtocolTokenTvl**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`ProtocolTokenTvl`](../interfaces/adapter.ProtocolTokenTvl.md), ``"tokens"``\> & { `totalSupply`: `string` ; `tokens?`: [`UnderlyingTokenTvl`](../interfaces/adapter.UnderlyingTokenTvl.md) & { `totalSupply`: `string` ; `iconUrl`: `string`  }[]  }

#### Defined in

[response.ts:100](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L100)

___

### DefiMovementsResponse

Ƭ **DefiMovementsResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `movements`: [`DisplayMovementsByBlock`](response.md#displaymovementsbyblock)[]  }\>

#### Defined in

[response.ts:105](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L105)

___

### DisplayMovementsByBlock

Ƭ **DisplayMovementsByBlock**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`MovementsByBlock`](../interfaces/adapter.MovementsByBlock.md), ``"underlyingTokensMovement"``\> & { `underlyingTokensMovement`: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )<`string`, [`BaseTokenMovement`](../interfaces/adapter.BaseTokenMovement.md) & { `movementValue`: `string`  }\>  }

#### Defined in

[response.ts:109](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L109)
