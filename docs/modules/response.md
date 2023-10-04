[@metamask-institutional/defi-adapters](../README.md) / response

# Module: response

## Table of contents

### Type Aliases

- [AdapterErrorResponse](response.md#adaptererrorresponse)
- [AdapterResponse](response.md#adapterresponse)
- [DefiPositionResponse](response.md#defipositionresponse)
- [DisplayPosition](response.md#displayposition)
- [DefiProfitsResponse](response.md#defiprofitsresponse)
- [DisplayProfitsWithRange](response.md#displayprofitswithrange)
- [PricePerShareResponse](response.md#pricepershareresponse)
- [APRResponse](response.md#aprresponse)
- [APYResponse](response.md#apyresponse)
- [TotalValueLockResponse](response.md#totalvaluelockresponse)
- [DisplayProtocolTokenTvl](response.md#displayprotocoltokentvl)
- [DefiMovementsResponse](response.md#defimovementsresponse)
- [DisplayMovementsByBlock](response.md#displaymovementsbyblock)

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

[response.ts:19](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L19)

___

### AdapterResponse

Ƭ **AdapterResponse**<`ProtocolResponse`\>: [`ProtocolDetails`](adapter.md#protocoldetails) & `ProtocolResponse` & { `success`: ``true``  } \| [`AdapterErrorResponse`](response.md#adaptererrorresponse) & { `success`: ``false``  }

#### Type parameters

| Name |
| :------ |
| `ProtocolResponse` |

#### Defined in

[response.ts:26](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L26)

___

### DefiPositionResponse

Ƭ **DefiPositionResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`DisplayPosition`](response.md#displayposition)<[`ProtocolPosition`](../interfaces/adapter.ProtocolPosition.md)\>[]  }\>

#### Defined in

[response.ts:32](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L32)

___

### DisplayPosition

Ƭ **DisplayPosition**<`PositionBalance`\>: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<`PositionBalance`, ``"tokens"``\> & { `balance`: `string` ; `tokens?`: [`DisplayPosition`](response.md#displayposition)<[`Underlying`](../interfaces/adapter.Underlying.md)\>[]  }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `PositionBalance` | extends `Object` |

#### Defined in

[response.ts:36](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L36)

___

### DefiProfitsResponse

Ƭ **DefiProfitsResponse**: [`AdapterResponse`](response.md#adapterresponse)<[`DisplayProfitsWithRange`](response.md#displayprofitswithrange)\>

#### Defined in

[response.ts:46](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L46)

___

### DisplayProfitsWithRange

Ƭ **DisplayProfitsWithRange**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`ProfitsWithRange`](../interfaces/adapter.ProfitsWithRange.md), ``"tokens"``\> & { `tokens`: `DisplayPositionProfits`[]  }

#### Defined in

[response.ts:48](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L48)

___

### PricePerShareResponse

Ƭ **PricePerShareResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: `DisplayProtocolTokenUnderlyingRate`[]  }\>

#### Defined in

[response.ts:56](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L56)

___

### APRResponse

Ƭ **APRResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`ProtocolTokenApr`](../interfaces/adapter.ProtocolTokenApr.md)[]  }\>

#### Defined in

[response.ts:67](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L67)

___

### APYResponse

Ƭ **APYResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`ProtocolTokenApy`](../interfaces/adapter.ProtocolTokenApy.md)[]  }\>

#### Defined in

[response.ts:71](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L71)

___

### TotalValueLockResponse

Ƭ **TotalValueLockResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`DisplayProtocolTokenTvl`](response.md#displayprotocoltokentvl)[]  }\>

#### Defined in

[response.ts:75](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L75)

___

### DisplayProtocolTokenTvl

Ƭ **DisplayProtocolTokenTvl**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`ProtocolTokenTvl`](../interfaces/adapter.ProtocolTokenTvl.md), ``"tokens"``\> & { `totalSupply`: `string` ; `tokens?`: [`UnderlyingTokenTvl`](../interfaces/adapter.UnderlyingTokenTvl.md) & { `totalSupply`: `string`  }[]  }

#### Defined in

[response.ts:79](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L79)

___

### DefiMovementsResponse

Ƭ **DefiMovementsResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `movements`: { `protocolToken`: [`Erc20Metadata`](erc20Metadata.md#erc20metadata) ; `positionMovements`: [`DisplayMovementsByBlock`](response.md#displaymovementsbyblock)[]  }[]  }\>

#### Defined in

[response.ts:84](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L84)

___

### DisplayMovementsByBlock

Ƭ **DisplayMovementsByBlock**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`MovementsByBlock`](../interfaces/adapter.MovementsByBlock.md), ``"underlyingTokensMovement"``\> & { `underlyingTokensMovement`: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )<`string`, [`BaseTokenMovement`](../interfaces/adapter.BaseTokenMovement.md) & { `movementValue`: `string`  }\>  }

#### Defined in

[response.ts:91](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L91)
