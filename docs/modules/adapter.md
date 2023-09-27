[@metamask-institutional/defi-adapters](../README.md) / adapter

# Module: adapter

## Table of contents

### Interfaces

- [GetProfitsInput](../interfaces/adapter.GetProfitsInput.md)
- [GetPositionsInput](../interfaces/adapter.GetPositionsInput.md)
- [GetClaimableRewardsInput](../interfaces/adapter.GetClaimableRewardsInput.md)
- [GetPricePerShareInput](../interfaces/adapter.GetPricePerShareInput.md)
- [GetTotalValueLockedInput](../interfaces/adapter.GetTotalValueLockedInput.md)
- [TokenBalance](../interfaces/adapter.TokenBalance.md)
- [Underlying](../interfaces/adapter.Underlying.md)
- [ProtocolRewardPosition](../interfaces/adapter.ProtocolRewardPosition.md)
- [ClaimableRewards](../interfaces/adapter.ClaimableRewards.md)
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
- [GetPricesInput](adapter.md#getpricesinput)
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

[adapter.ts:6](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L6)

[adapter.ts:11](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L11)

___

### PositionType

Ƭ **PositionType**: typeof [`PositionType`](adapter.md#positiontype)[keyof typeof [`PositionType`](adapter.md#positiontype)]

#### Defined in

[adapter.ts:13](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L13)

[adapter.ts:34](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L34)

___

### GetBalancesInput

Ƭ **GetBalancesInput**: [`GetPositionsInput`](../interfaces/adapter.GetPositionsInput.md) & { `provider`: `ethers.JsonRpcProvider` ; `chainId`: `Chain` ; `tokens`: [`Erc20Metadata`](erc20Metadata.md#erc20metadata)[]  }

#### Defined in

[adapter.ts:36](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L36)

___

### GetPricesInput

Ƭ **GetPricesInput**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `blockNumber?` | `number` | Optional override param |
| `protocolTokenAddress` | `string` | Protocol token address (LP token address). |

#### Defined in

[adapter.ts:42](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L42)

___

### GetApyInput

Ƭ **GetApyInput**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `blockNumber?` | `number` | Optional override param |
| `protocolTokenAddress` | `string` | Protocol token address (LP token address). |

#### Defined in

[adapter.ts:52](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L52)

___

### GetAprInput

Ƭ **GetAprInput**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `blockNumber?` | `number` | Optional override param |
| `protocolTokenAddress` | `string` | Protocol token address (LP token address). |

#### Defined in

[adapter.ts:63](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L63)

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

#### Defined in

[adapter.ts:74](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L74)

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

#### Defined in

[adapter.ts:111](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L111)

## Variables

### TokenType

• `Const` **TokenType**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `Protocol` | ``"protocol"`` |
| `Reward` | ``"claimable"`` |
| `Underlying` | ``"underlying"`` |

#### Defined in

[adapter.ts:6](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L6)

[adapter.ts:11](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L11)

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

[adapter.ts:13](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L13)

[adapter.ts:34](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/adapter.ts#L34)
