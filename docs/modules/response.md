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
- [DisplayProtocolTokenUnderlyingRate](response.md#displayprotocoltokenunderlyingrate)
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

[response.ts:21](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L21)

___

### AdapterResponse

Ƭ **AdapterResponse**<`ProtocolResponse`\>: [`ProtocolDetails`](adapter.md#protocoldetails) & `ProtocolResponse` & { `success`: ``true``  } \| [`AdapterErrorResponse`](response.md#adaptererrorresponse) & { `success`: ``false``  }

#### Type parameters

| Name |
| :------ |
| `ProtocolResponse` |

#### Defined in

[response.ts:28](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L28)

___

### DefiPositionResponse

Ƭ **DefiPositionResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`DisplayPosition`](response.md#displayposition)<[`ProtocolPosition`](../interfaces/adapter.ProtocolPosition.md)\>[]  }\>

#### Defined in

[response.ts:34](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L34)

___

### DisplayPosition

Ƭ **DisplayPosition**<`PositionBalance`\>: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<`PositionBalance`, ``"tokens"``\> & { `balance`: `string` ; `tokens?`: [`DisplayPosition`](response.md#displayposition)<[`Underlying`](../interfaces/adapter.Underlying.md)\>[]  } & `PositionBalance`[``"type"``] extends typeof [`Underlying`](adapter.md#underlying) ? { `iconUrl`: `string`  } : [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )<`string`, `never`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `PositionBalance` | extends [`TokenBalance`](../interfaces/adapter.TokenBalance.md) & { `type`: [`TokenType`](adapter.md#tokentype) ; `tokens?`: [`Underlying`](../interfaces/adapter.Underlying.md)[]  } |

#### Defined in

[response.ts:38](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L38)

___

### DefiProfitsResponse

Ƭ **DefiProfitsResponse**: [`AdapterResponse`](response.md#adapterresponse)<[`DisplayProfitsWithRange`](response.md#displayprofitswithrange)\>

#### Defined in

[response.ts:50](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L50)

___

### DisplayProfitsWithRange

Ƭ **DisplayProfitsWithRange**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`ProfitsWithRange`](../interfaces/adapter.ProfitsWithRange.md), ``"tokens"``\> & { `tokens`: `DisplayPositionProfits`[]  }

#### Defined in

[response.ts:52](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L52)

___

### PricePerShareResponse

Ƭ **PricePerShareResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`DisplayProtocolTokenUnderlyingRate`](response.md#displayprotocoltokenunderlyingrate)[]  }\>

#### Defined in

[response.ts:60](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L60)

___

### DisplayProtocolTokenUnderlyingRate

Ƭ **DisplayProtocolTokenUnderlyingRate**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`ProtocolTokenUnderlyingRate`](../interfaces/adapter.ProtocolTokenUnderlyingRate.md), ``"tokens"``\> & { `tokens?`: [`UnderlyingTokenRate`](../interfaces/adapter.UnderlyingTokenRate.md) & { `underlyingRate`: `string` ; `iconUrl`: `string`  }[]  }

#### Defined in

[response.ts:64](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L64)

___

### APRResponse

Ƭ **APRResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`ProtocolTokenApr`](../interfaces/adapter.ProtocolTokenApr.md)[]  }\>

#### Defined in

[response.ts:71](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L71)

___

### APYResponse

Ƭ **APYResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`ProtocolTokenApy`](../interfaces/adapter.ProtocolTokenApy.md)[]  }\>

#### Defined in

[response.ts:75](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L75)

___

### TotalValueLockResponse

Ƭ **TotalValueLockResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `tokens`: [`DisplayProtocolTokenTvl`](response.md#displayprotocoltokentvl)[]  }\>

#### Defined in

[response.ts:79](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L79)

___

### DisplayProtocolTokenTvl

Ƭ **DisplayProtocolTokenTvl**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`ProtocolTokenTvl`](../interfaces/adapter.ProtocolTokenTvl.md), ``"tokens"``\> & { `totalSupply`: `string` ; `tokens?`: [`UnderlyingTokenTvl`](../interfaces/adapter.UnderlyingTokenTvl.md) & { `totalSupply`: `string` ; `iconUrl`: `string`  }[]  }

#### Defined in

[response.ts:83](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L83)

___

### DefiMovementsResponse

Ƭ **DefiMovementsResponse**: [`AdapterResponse`](response.md#adapterresponse)<{ `movements`: { `protocolToken`: [`Erc20Metadata`](erc20Metadata.md#erc20metadata) ; `positionMovements`: [`DisplayMovementsByBlock`](response.md#displaymovementsbyblock)[]  }[]  }\>

#### Defined in

[response.ts:88](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L88)

___

### DisplayMovementsByBlock

Ƭ **DisplayMovementsByBlock**: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )<[`MovementsByBlock`](../interfaces/adapter.MovementsByBlock.md), ``"underlyingTokensMovement"``\> & { `underlyingTokensMovement`: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )<`string`, [`BaseTokenMovement`](../interfaces/adapter.BaseTokenMovement.md) & { `movementValue`: `string`  }\>  }

#### Defined in

[response.ts:95](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/response.ts#L95)
