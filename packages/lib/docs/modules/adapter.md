[@metamask-institutional/defi-adapters](../README.md) / adapter

# Module: adapter

## Table of contents

### Interfaces

- [GetPositionsInputWithTokenAddresses](../interfaces/adapter.GetPositionsInputWithTokenAddresses.md)
- [GetPositionsInput](../interfaces/adapter.GetPositionsInput.md)
- [GetTotalValueLockedInput](../interfaces/adapter.GetTotalValueLockedInput.md)
- [TokenBalance](../interfaces/adapter.TokenBalance.md)
- [Underlying](../interfaces/adapter.Underlying.md)
- [ProtocolPosition](../interfaces/adapter.ProtocolPosition.md)
- [UnwrappedTokenExchangeRate](../interfaces/adapter.UnwrappedTokenExchangeRate.md)
- [UnwrapExchangeRate](../interfaces/adapter.UnwrapExchangeRate.md)
- [MovementsByBlock](../interfaces/adapter.MovementsByBlock.md)
- [TokenTvl](../interfaces/adapter.TokenTvl.md)
- [UnderlyingTokenTvl](../interfaces/adapter.UnderlyingTokenTvl.md)
- [ProtocolTokenTvl](../interfaces/adapter.ProtocolTokenTvl.md)
- [ProfitsWithRange](../interfaces/adapter.ProfitsWithRange.md)
- [UnderlyingProfitValues](../interfaces/adapter.UnderlyingProfitValues.md)
- [PositionProfits](../interfaces/adapter.PositionProfits.md)
- [CalculationData](../interfaces/adapter.CalculationData.md)
- [ProtocolAdapterParams](../interfaces/adapter.ProtocolAdapterParams.md)

### Type Aliases

- [TokenType](adapter.md#tokentype-1)
- [AssetType](adapter.md#assettype-1)
- [PositionType](adapter.md#positiontype-1)
- [GetBalancesInput](adapter.md#getbalancesinput)
- [UnwrapInput](adapter.md#unwrapinput)
- [GetEventsInput](adapter.md#geteventsinput)
- [AssetDetails](adapter.md#assetdetails)
- [ProtocolDetails](adapter.md#protocoldetails)

### Variables

- [TokenType](adapter.md#tokentype)
- [AssetType](adapter.md#assettype)
- [PositionType](adapter.md#positiontype)

## Type Aliases

### TokenType

Ƭ **TokenType**: typeof [`TokenType`](adapter.md#tokentype)[keyof typeof [`TokenType`](adapter.md#tokentype)]

#### Defined in

[packages/lib/src/types/adapter.ts:7](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L7)

[packages/lib/src/types/adapter.ts:13](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L13)

___

### AssetType

Ƭ **AssetType**: typeof [`AssetType`](adapter.md#assettype)[keyof typeof [`AssetType`](adapter.md#assettype)]

#### Defined in

[packages/lib/src/types/adapter.ts:15](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L15)

[packages/lib/src/types/adapter.ts:19](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L19)

___

### PositionType

Ƭ **PositionType**: typeof [`PositionType`](adapter.md#positiontype)[keyof typeof [`PositionType`](adapter.md#positiontype)]

#### Defined in

[packages/lib/src/types/adapter.ts:21](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L21)

[packages/lib/src/types/adapter.ts:48](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L48)

___

### GetBalancesInput

Ƭ **GetBalancesInput**: [`GetPositionsInput`](../interfaces/adapter.GetPositionsInput.md) & \{ `provider`: `CustomJsonRpcProvider` ; `chainId`: `Chain` ; `tokens`: [`Erc20Metadata`](erc20Metadata.md#erc20metadata)[]  }

#### Defined in

[packages/lib/src/types/adapter.ts:50](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L50)

___

### UnwrapInput

Ƭ **UnwrapInput**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `blockNumber?` | `number` | Optional override param |
| `protocolTokenAddress` | `string` | Protocol token address (LP token address). |
| `tokenId?` | `string` | Optional filter for pools that will be queried by an ID |

#### Defined in

[packages/lib/src/types/adapter.ts:56](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L56)

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

[packages/lib/src/types/adapter.ts:72](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L72)

___

### AssetDetails

Ƭ **AssetDetails**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `type` | [`AssetType`](adapter.md#assettype-1) |

#### Defined in

[packages/lib/src/types/adapter.ts:99](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L99)

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
| `positionType` | [`PositionType`](adapter.md#positiontype-1) | Type of position One adapter per type |
| `productId` | `string` | Unique protocol-product name |
| `assetDetails` | [`AssetDetails`](adapter.md#assetdetails) |  |

#### Defined in

[packages/lib/src/types/adapter.ts:103](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L103)

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

#### Defined in

[packages/lib/src/types/adapter.ts:7](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L7)

[packages/lib/src/types/adapter.ts:13](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L13)

___

### AssetType

• `Const` **AssetType**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `StandardErc20` | ``"StandardErc20"`` |
| `NonStandardErc20` | ``"NonStandardErc20"`` |

#### Defined in

[packages/lib/src/types/adapter.ts:15](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L15)

[packages/lib/src/types/adapter.ts:19](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L19)

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
| `FiatPrices` | ``"fiat-prices"`` | - |

#### Defined in

[packages/lib/src/types/adapter.ts:21](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L21)

[packages/lib/src/types/adapter.ts:48](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/adapter.ts#L48)
