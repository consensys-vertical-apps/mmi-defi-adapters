[@metamask-institutional/defi-adapters](../README.md) / adapter

# Module: adapter

## Table of contents

### Interfaces

- [GetProfitsInput](../interfaces/adapter.GetProfitsInput.md)
- [GetPositionsInput](../interfaces/adapter.GetPositionsInput.md)
- [GetPricePerShareInput](../interfaces/adapter.GetPricePerShareInput.md)
- [GetTotalValueLockedInput](../interfaces/adapter.GetTotalValueLockedInput.md)
- [TokenBalance](../interfaces/adapter.TokenBalance.md)
- [Underlying](../interfaces/adapter.Underlying.md)
- [ProtocolPosition](../interfaces/adapter.ProtocolPosition.md)
- [UnderlyingTokenRate](../interfaces/adapter.UnderlyingTokenRate.md)
- [ProtocolTokenUnderlyingRate](../interfaces/adapter.ProtocolTokenUnderlyingRate.md)
- [BaseTokenMovement](../interfaces/adapter.BaseTokenMovement.md)
- [MovementsByBlock](../interfaces/adapter.MovementsByBlock.md)
- [ProtocolTokenApy](../interfaces/adapter.ProtocolTokenApy.md)
- [ProtocolTokenApr](../interfaces/adapter.ProtocolTokenApr.md)
- [UnderlyingTokenTvl](../interfaces/adapter.UnderlyingTokenTvl.md)
- [ProtocolTokenTvl](../interfaces/adapter.ProtocolTokenTvl.md)
- [ProfitsWithRange](../interfaces/adapter.ProfitsWithRange.md)
- [UnderlyingProfitValues](../interfaces/adapter.UnderlyingProfitValues.md)
- [PositionProfits](../interfaces/adapter.PositionProfits.md)
- [CalculationData](../interfaces/adapter.CalculationData.md)
- [ProtocolAdapterParams](../interfaces/adapter.ProtocolAdapterParams.md)

### Type Aliases

- [TokenType](adapter.md#tokentype-1)
- [PositionType](adapter.md#positiontype-1)
- [GetBalancesInput](adapter.md#getbalancesinput)
- [GetConversionRateInput](adapter.md#getconversionrateinput)
- [GetApyInput](adapter.md#getapyinput)
- [GetAprInput](adapter.md#getaprinput)
- [GetEventsInput](adapter.md#geteventsinput)
- [ProtocolDetails](adapter.md#protocoldetails)

### Variables

- [TokenType](adapter.md#tokentype)
- [PositionType](adapter.md#positiontype)

## Type Aliases

### TokenType

Ƭ **TokenType**: typeof [`TokenType`](adapter.md#tokentype)[keyof typeof [`TokenType`](adapter.md#tokentype)]

#### Defined in

[adapter.ts:7](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L7)

[adapter.ts:13](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L13)

___

### PositionType

Ƭ **PositionType**: typeof [`PositionType`](adapter.md#positiontype)[keyof typeof [`PositionType`](adapter.md#positiontype)]

#### Defined in

[adapter.ts:15](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L15)

[adapter.ts:36](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L36)

___

### GetBalancesInput

Ƭ **GetBalancesInput**: [`GetPositionsInput`](../interfaces/adapter.GetPositionsInput.md) & { `provider`: `CustomJsonRpcProvider` ; `chainId`: `Chain` ; `tokens`: [`Erc20Metadata`](erc20Metadata.md#erc20metadata)[]  }

#### Defined in

[adapter.ts:38](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L38)

___

### GetConversionRateInput

Ƭ **GetConversionRateInput**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `blockNumber?` | `number` | Optional override param |
| `protocolTokenAddress` | `string` | Protocol token address (LP token address). |

#### Defined in

[adapter.ts:44](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L44)

___

### GetApyInput

Ƭ **GetApyInput**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `blockNumber?` | `number` | Optional override param |
| `protocolTokenAddress` | `string` | Protocol token address (LP token address). |

#### Defined in

[adapter.ts:54](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L54)

___

### GetAprInput

Ƭ **GetAprInput**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `blockNumber?` | `number` | Optional override param |
| `protocolTokenAddress` | `string` | Protocol token address (LP token address). |

#### Defined in

[adapter.ts:65](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L65)

___

### GetEventsInput

Ƭ **GetEventsInput**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `userAddress` | `string` | User address we want to get events for |
| `protocolTokenAddress` | `string` | Protocol token we want to check related events for |
| `fromBlock` | `number` | Starting blocknumber to check from |
| `toBlock` | `number` | End blocknumber we want to check to e.g. current blocknumber |
| `tokenId?` | `string` | Used by NFT Defi Positions, e.g. uniswapV3 |

#### Defined in

[adapter.ts:76](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L76)

___

### ProtocolDetails

Ƭ **ProtocolDetails**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `protocolId` | `Protocol` | Unique protocol id |
| `chainId` | `Chain` | Chain this adapter is for |
| `name` | `string` | Name of protocol |
| `description` | `string` | Description of protocol |
| `iconUrl` | `string` | Protocol icon |
| `siteUrl` | `string` | Protocol website |
| `positionType` | [`PositionType`](adapter.md#positiontype) | Type of position One adapter per type |
| `productId` | `string` | Unique protocol-product name |

#### Defined in

[adapter.ts:118](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L118)

## Variables

### TokenType

• `Const` **TokenType**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `Protocol` | ``"protocol"`` |
| `Reward` | ``"claimable"`` |
| `Underlying` | ``"underlying"`` |
| `UnderlyingClaimableFee` | ``"underlying-claimable-fee"`` |

#### Defined in

[adapter.ts:7](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L7)

[adapter.ts:13](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L13)

___

### PositionType

• `Const` **PositionType**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `Supply` | ``"supply"`` | Liquidity position e.g. a dex pool |
| `Lend` | ``"lend"`` | Providing liquidity to a lending and borrow protocol |
| `Borrow` | ``"borrow"`` | Getting a loan from a lending and borrow protocol |
| `Staked` | ``"stake"`` | Staking a token e.g. staking eth or staking an lp token |

#### Defined in

[adapter.ts:15](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L15)

[adapter.ts:36](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L36)
