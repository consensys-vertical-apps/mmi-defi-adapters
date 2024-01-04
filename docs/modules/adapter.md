[@metamask-institutional/defi-adapters](../README.md) / adapter

# Module: adapter

## Table of contents

### Interfaces

- [GetPositionsInput](../interfaces/adapter.GetPositionsInput.md)
- [GetPricePerShareInput](../interfaces/adapter.GetPricePerShareInput.md)
- [GetTotalValueLockedInput](../interfaces/adapter.GetTotalValueLockedInput.md)
- [TokenBalance](../interfaces/adapter.TokenBalance.md)
- [Underlying](../interfaces/adapter.Underlying.md)
- [ProtocolPosition](../interfaces/adapter.ProtocolPosition.md)
- [UnderlyingTokenRate](../interfaces/adapter.UnderlyingTokenRate.md)
- [ProtocolTokenUnderlyingRate](../interfaces/adapter.ProtocolTokenUnderlyingRate.md)
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

[adapter.ts:14](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L14)

___

### PositionType

Ƭ **PositionType**: typeof [`PositionType`](adapter.md#positiontype)[keyof typeof [`PositionType`](adapter.md#positiontype)]

#### Defined in

[adapter.ts:16](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L16)

[adapter.ts:41](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L41)

___

### GetBalancesInput

Ƭ **GetBalancesInput**: [`GetPositionsInput`](../interfaces/adapter.GetPositionsInput.md) & { `provider`: `CustomJsonRpcProvider` ; `chainId`: `Chain` ; `tokens`: [`Erc20Metadata`](erc20Metadata.md#erc20metadata)[]  }

#### Defined in

[adapter.ts:43](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L43)

___

### GetConversionRateInput

Ƭ **GetConversionRateInput**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `blockNumber?` | `number` | Optional override param |
| `protocolTokenAddress` | `string` | Protocol token address (LP token address). |

#### Defined in

[adapter.ts:49](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L49)

___

### GetApyInput

Ƭ **GetApyInput**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `blockNumber?` | `number` | Optional override param |
| `protocolTokenAddress` | `string` | Protocol token address (LP token address). |

#### Defined in

[adapter.ts:59](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L59)

___

### GetAprInput

Ƭ **GetAprInput**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `blockNumber?` | `number` | Optional override param |
| `protocolTokenAddress` | `string` | Protocol token address (LP token address). |

#### Defined in

[adapter.ts:70](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L70)

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

[adapter.ts:81](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L81)

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

[adapter.ts:108](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L108)

## Variables

### TokenType

• `Const` **TokenType**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `Protocol` | ``"protocol"`` |
| `Reward` | ``"claimable"`` |
| `Underlying` | ``"underlying"`` |
| `UnderlyingClaimable` | ``"underlying-claimable"`` |
| `Fiat` | ``"fiat"`` |

#### Defined in

[adapter.ts:7](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L7)

[adapter.ts:14](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L14)

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
| `Reward` | ``"reward"`` | Claimable rewards, these type of positions will be merged with the equivalent lp position |

#### Defined in

[adapter.ts:16](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L16)

[adapter.ts:41](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/adapter.ts#L41)
