[@metamask-institutional/defi-adapters](../README.md) / response

# Module: response

## Table of contents

### Type Aliases

- [AdapterErrorResponse](response.md#adaptererrorresponse)
- [AdapterResponse](response.md#adapterresponse)
- [DefiPositionResponse](response.md#defipositionresponse)
- [PricePerShareResponse](response.md#pricepershareresponse)
- [APRResponse](response.md#aprresponse)
- [APYResponse](response.md#apyresponse)
- [TotalValueLockResponse](response.md#totalvaluelockresponse)
- [DefiProfitsResponse](response.md#defiprofitsresponse)
- [DefiMovementsResponse](response.md#defimovementsresponse)

## Type Aliases

### AdapterErrorResponse

Ƭ **AdapterErrorResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `error` | { `message`: `string` ; `details?`: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )<`string`, `unknown`\>  } |
| `error.message` | `string` |
| `error.details?` | [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )<`string`, `unknown`\> |

#### Defined in

[response.ts:13](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/response.ts#L13)

___

### AdapterResponse

Ƭ **AdapterResponse**<`ProtocolResponse`\>: [`ProtocolDetails`](adapter.md#protocoldetails) & `ProtocolResponse` & { `success`: ``true``  } \| [`AdapterErrorResponse`](response.md#adaptererrorresponse) & { `success`: ``false``  }

#### Type parameters

| Name |
| :------ |
| `ProtocolResponse` |

#### Defined in

[response.ts:20](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/response.ts#L20)

___

### DefiPositionResponse

Ƭ **DefiPositionResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`ProtocolPosition`](../interfaces/adapter.ProtocolPosition.md)[]  }\>

#### Defined in

[response.ts:26](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/response.ts#L26)

___

### PricePerShareResponse

Ƭ **PricePerShareResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`ProtocolTokenUnderlyingRate`](../interfaces/adapter.ProtocolTokenUnderlyingRate.md)[]  }\>

#### Defined in

[response.ts:30](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/response.ts#L30)

___

### APRResponse

Ƭ **APRResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`ProtocolTokenApr`](../interfaces/adapter.ProtocolTokenApr.md)[]  }\>

#### Defined in

[response.ts:34](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/response.ts#L34)

___

### APYResponse

Ƭ **APYResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`ProtocolTokenApy`](../interfaces/adapter.ProtocolTokenApy.md)[]  }\>

#### Defined in

[response.ts:38](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/response.ts#L38)

___

### TotalValueLockResponse

Ƭ **TotalValueLockResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`ProtocolTokenTvl`](../interfaces/adapter.ProtocolTokenTvl.md)[]  }\>

#### Defined in

[response.ts:42](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/response.ts#L42)

___

### DefiProfitsResponse

Ƭ **DefiProfitsResponse**: [`AdapterResponse`](response.md#adapterresponse)<[`ProfitsWithRange`](../interfaces/adapter.ProfitsWithRange.md)\>

#### Defined in

[response.ts:46](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/response.ts#L46)

___

### DefiMovementsResponse

Ƭ **DefiMovementsResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `movements`: { `protocolToken`: [`Erc20Metadata`](erc20Metadata.md#erc20metadata) ; `positionMovements`: [`MovementsByBlock`](../interfaces/adapter.MovementsByBlock.md)[]  }[]  }\>

#### Defined in

[response.ts:48](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/response.ts#L48)
