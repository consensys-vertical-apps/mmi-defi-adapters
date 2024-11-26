/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  EventFragment,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedLogDescription,
  TypedListener,
  TypedContractMethod,
} from "./common";

export declare namespace WeightedPool {
  export type NewPoolParamsStruct = {
    name: string;
    symbol: string;
    tokens: AddressLike[];
    normalizedWeights: BigNumberish[];
    rateProviders: AddressLike[];
    assetManagers: AddressLike[];
    swapFeePercentage: BigNumberish;
  };

  export type NewPoolParamsStructOutput = [
    name: string,
    symbol: string,
    tokens: string[],
    normalizedWeights: bigint[],
    rateProviders: string[],
    assetManagers: string[],
    swapFeePercentage: bigint
  ] & {
    name: string;
    symbol: string;
    tokens: string[];
    normalizedWeights: bigint[];
    rateProviders: string[];
    assetManagers: string[];
    swapFeePercentage: bigint;
  };
}

export declare namespace IPoolSwapStructs {
  export type SwapRequestStruct = {
    kind: BigNumberish;
    tokenIn: AddressLike;
    tokenOut: AddressLike;
    amount: BigNumberish;
    poolId: BytesLike;
    lastChangeBlock: BigNumberish;
    from: AddressLike;
    to: AddressLike;
    userData: BytesLike;
  };

  export type SwapRequestStructOutput = [
    kind: bigint,
    tokenIn: string,
    tokenOut: string,
    amount: bigint,
    poolId: string,
    lastChangeBlock: bigint,
    from: string,
    to: string,
    userData: string
  ] & {
    kind: bigint;
    tokenIn: string;
    tokenOut: string;
    amount: bigint;
    poolId: string;
    lastChangeBlock: bigint;
    from: string;
    to: string;
    userData: string;
  };
}

export interface WeightedPoolInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "DELEGATE_PROTOCOL_SWAP_FEES_SENTINEL"
      | "DOMAIN_SEPARATOR"
      | "allowance"
      | "approve"
      | "balanceOf"
      | "decimals"
      | "decreaseAllowance"
      | "disableRecoveryMode"
      | "enableRecoveryMode"
      | "getATHRateProduct"
      | "getActionId"
      | "getActualSupply"
      | "getAuthorizer"
      | "getDomainSeparator"
      | "getInvariant"
      | "getLastPostJoinExitInvariant"
      | "getNextNonce"
      | "getNormalizedWeights"
      | "getOwner"
      | "getPausedState"
      | "getPoolId"
      | "getProtocolFeePercentageCache"
      | "getProtocolFeesCollector"
      | "getProtocolSwapFeeDelegation"
      | "getRateProviders"
      | "getScalingFactors"
      | "getSwapFeePercentage"
      | "getVault"
      | "inRecoveryMode"
      | "increaseAllowance"
      | "name"
      | "nonces"
      | "onExitPool"
      | "onJoinPool"
      | "onSwap"
      | "pause"
      | "permit"
      | "queryExit"
      | "queryJoin"
      | "setAssetManagerPoolConfig"
      | "setSwapFeePercentage"
      | "symbol"
      | "totalSupply"
      | "transfer"
      | "transferFrom"
      | "unpause"
      | "updateProtocolFeePercentageCache"
      | "version"
  ): FunctionFragment;

  getEvent(
    nameOrSignatureOrTopic:
      | "Approval"
      | "PausedStateChanged"
      | "ProtocolFeePercentageCacheUpdated"
      | "RecoveryModeStateChanged"
      | "SwapFeePercentageChanged"
      | "Transfer"
  ): EventFragment;

  encodeFunctionData(
    functionFragment: "DELEGATE_PROTOCOL_SWAP_FEES_SENTINEL",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "DOMAIN_SEPARATOR",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "allowance",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "approve",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "balanceOf",
    values: [AddressLike]
  ): string;
  encodeFunctionData(functionFragment: "decimals", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "decreaseAllowance",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "disableRecoveryMode",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "enableRecoveryMode",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getATHRateProduct",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getActionId",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "getActualSupply",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getAuthorizer",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getDomainSeparator",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getInvariant",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getLastPostJoinExitInvariant",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getNextNonce",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "getNormalizedWeights",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "getOwner", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "getPausedState",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "getPoolId", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "getProtocolFeePercentageCache",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "getProtocolFeesCollector",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getProtocolSwapFeeDelegation",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getRateProviders",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getScalingFactors",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getSwapFeePercentage",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "getVault", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "inRecoveryMode",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "increaseAllowance",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "name", values?: undefined): string;
  encodeFunctionData(functionFragment: "nonces", values: [AddressLike]): string;
  encodeFunctionData(
    functionFragment: "onExitPool",
    values: [
      BytesLike,
      AddressLike,
      AddressLike,
      BigNumberish[],
      BigNumberish,
      BigNumberish,
      BytesLike
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "onJoinPool",
    values: [
      BytesLike,
      AddressLike,
      AddressLike,
      BigNumberish[],
      BigNumberish,
      BigNumberish,
      BytesLike
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "onSwap",
    values: [IPoolSwapStructs.SwapRequestStruct, BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "pause", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "permit",
    values: [
      AddressLike,
      AddressLike,
      BigNumberish,
      BigNumberish,
      BigNumberish,
      BytesLike,
      BytesLike
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "queryExit",
    values: [
      BytesLike,
      AddressLike,
      AddressLike,
      BigNumberish[],
      BigNumberish,
      BigNumberish,
      BytesLike
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "queryJoin",
    values: [
      BytesLike,
      AddressLike,
      AddressLike,
      BigNumberish[],
      BigNumberish,
      BigNumberish,
      BytesLike
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "setAssetManagerPoolConfig",
    values: [AddressLike, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "setSwapFeePercentage",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "symbol", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "totalSupply",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "transfer",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "transferFrom",
    values: [AddressLike, AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "unpause", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "updateProtocolFeePercentageCache",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "version", values?: undefined): string;

  decodeFunctionResult(
    functionFragment: "DELEGATE_PROTOCOL_SWAP_FEES_SENTINEL",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "DOMAIN_SEPARATOR",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "allowance", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "approve", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "balanceOf", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "decimals", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "decreaseAllowance",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "disableRecoveryMode",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "enableRecoveryMode",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getATHRateProduct",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getActionId",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getActualSupply",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getAuthorizer",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getDomainSeparator",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getInvariant",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getLastPostJoinExitInvariant",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getNextNonce",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getNormalizedWeights",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "getOwner", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "getPausedState",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "getPoolId", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "getProtocolFeePercentageCache",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getProtocolFeesCollector",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getProtocolSwapFeeDelegation",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getRateProviders",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getScalingFactors",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getSwapFeePercentage",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "getVault", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "inRecoveryMode",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "increaseAllowance",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "name", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "nonces", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "onExitPool", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "onJoinPool", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "onSwap", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "pause", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "permit", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "queryExit", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "queryJoin", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "setAssetManagerPoolConfig",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setSwapFeePercentage",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "symbol", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "totalSupply",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "transfer", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "transferFrom",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "unpause", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "updateProtocolFeePercentageCache",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "version", data: BytesLike): Result;
}

export namespace ApprovalEvent {
  export type InputTuple = [
    owner: AddressLike,
    spender: AddressLike,
    value: BigNumberish
  ];
  export type OutputTuple = [owner: string, spender: string, value: bigint];
  export interface OutputObject {
    owner: string;
    spender: string;
    value: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace PausedStateChangedEvent {
  export type InputTuple = [paused: boolean];
  export type OutputTuple = [paused: boolean];
  export interface OutputObject {
    paused: boolean;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace ProtocolFeePercentageCacheUpdatedEvent {
  export type InputTuple = [
    feeType: BigNumberish,
    protocolFeePercentage: BigNumberish
  ];
  export type OutputTuple = [feeType: bigint, protocolFeePercentage: bigint];
  export interface OutputObject {
    feeType: bigint;
    protocolFeePercentage: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace RecoveryModeStateChangedEvent {
  export type InputTuple = [enabled: boolean];
  export type OutputTuple = [enabled: boolean];
  export interface OutputObject {
    enabled: boolean;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace SwapFeePercentageChangedEvent {
  export type InputTuple = [swapFeePercentage: BigNumberish];
  export type OutputTuple = [swapFeePercentage: bigint];
  export interface OutputObject {
    swapFeePercentage: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace TransferEvent {
  export type InputTuple = [
    from: AddressLike,
    to: AddressLike,
    value: BigNumberish
  ];
  export type OutputTuple = [from: string, to: string, value: bigint];
  export interface OutputObject {
    from: string;
    to: string;
    value: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface WeightedPool extends BaseContract {
  connect(runner?: ContractRunner | null): WeightedPool;
  waitForDeployment(): Promise<this>;

  interface: WeightedPoolInterface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  once<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  listeners<TCEvent extends TypedContractEvent>(
    event: TCEvent
  ): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(
    event?: TCEvent
  ): Promise<this>;

  DELEGATE_PROTOCOL_SWAP_FEES_SENTINEL: TypedContractMethod<
    [],
    [bigint],
    "view"
  >;

  DOMAIN_SEPARATOR: TypedContractMethod<[], [string], "view">;

  allowance: TypedContractMethod<
    [owner: AddressLike, spender: AddressLike],
    [bigint],
    "view"
  >;

  approve: TypedContractMethod<
    [spender: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;

  balanceOf: TypedContractMethod<[account: AddressLike], [bigint], "view">;

  decimals: TypedContractMethod<[], [bigint], "view">;

  decreaseAllowance: TypedContractMethod<
    [spender: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;

  disableRecoveryMode: TypedContractMethod<[], [void], "nonpayable">;

  enableRecoveryMode: TypedContractMethod<[], [void], "nonpayable">;

  getATHRateProduct: TypedContractMethod<[], [bigint], "view">;

  getActionId: TypedContractMethod<[selector: BytesLike], [string], "view">;

  getActualSupply: TypedContractMethod<[], [bigint], "view">;

  getAuthorizer: TypedContractMethod<[], [string], "view">;

  getDomainSeparator: TypedContractMethod<[], [string], "view">;

  getInvariant: TypedContractMethod<[], [bigint], "view">;

  getLastPostJoinExitInvariant: TypedContractMethod<[], [bigint], "view">;

  getNextNonce: TypedContractMethod<[account: AddressLike], [bigint], "view">;

  getNormalizedWeights: TypedContractMethod<[], [bigint[]], "view">;

  getOwner: TypedContractMethod<[], [string], "view">;

  getPausedState: TypedContractMethod<
    [],
    [
      [boolean, bigint, bigint] & {
        paused: boolean;
        pauseWindowEndTime: bigint;
        bufferPeriodEndTime: bigint;
      }
    ],
    "view"
  >;

  getPoolId: TypedContractMethod<[], [string], "view">;

  getProtocolFeePercentageCache: TypedContractMethod<
    [feeType: BigNumberish],
    [bigint],
    "view"
  >;

  getProtocolFeesCollector: TypedContractMethod<[], [string], "view">;

  getProtocolSwapFeeDelegation: TypedContractMethod<[], [boolean], "view">;

  getRateProviders: TypedContractMethod<[], [string[]], "view">;

  getScalingFactors: TypedContractMethod<[], [bigint[]], "view">;

  getSwapFeePercentage: TypedContractMethod<[], [bigint], "view">;

  getVault: TypedContractMethod<[], [string], "view">;

  inRecoveryMode: TypedContractMethod<[], [boolean], "view">;

  increaseAllowance: TypedContractMethod<
    [spender: AddressLike, addedValue: BigNumberish],
    [boolean],
    "nonpayable"
  >;

  name: TypedContractMethod<[], [string], "view">;

  nonces: TypedContractMethod<[owner: AddressLike], [bigint], "view">;

  onExitPool: TypedContractMethod<
    [
      poolId: BytesLike,
      sender: AddressLike,
      recipient: AddressLike,
      balances: BigNumberish[],
      lastChangeBlock: BigNumberish,
      protocolSwapFeePercentage: BigNumberish,
      userData: BytesLike
    ],
    [[bigint[], bigint[]]],
    "nonpayable"
  >;

  onJoinPool: TypedContractMethod<
    [
      poolId: BytesLike,
      sender: AddressLike,
      recipient: AddressLike,
      balances: BigNumberish[],
      lastChangeBlock: BigNumberish,
      protocolSwapFeePercentage: BigNumberish,
      userData: BytesLike
    ],
    [[bigint[], bigint[]]],
    "nonpayable"
  >;

  onSwap: TypedContractMethod<
    [
      request: IPoolSwapStructs.SwapRequestStruct,
      balanceTokenIn: BigNumberish,
      balanceTokenOut: BigNumberish
    ],
    [bigint],
    "nonpayable"
  >;

  pause: TypedContractMethod<[], [void], "nonpayable">;

  permit: TypedContractMethod<
    [
      owner: AddressLike,
      spender: AddressLike,
      value: BigNumberish,
      deadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike
    ],
    [void],
    "nonpayable"
  >;

  queryExit: TypedContractMethod<
    [
      poolId: BytesLike,
      sender: AddressLike,
      recipient: AddressLike,
      balances: BigNumberish[],
      lastChangeBlock: BigNumberish,
      protocolSwapFeePercentage: BigNumberish,
      userData: BytesLike
    ],
    [[bigint, bigint[]] & { bptIn: bigint; amountsOut: bigint[] }],
    "nonpayable"
  >;

  queryJoin: TypedContractMethod<
    [
      poolId: BytesLike,
      sender: AddressLike,
      recipient: AddressLike,
      balances: BigNumberish[],
      lastChangeBlock: BigNumberish,
      protocolSwapFeePercentage: BigNumberish,
      userData: BytesLike
    ],
    [[bigint, bigint[]] & { bptOut: bigint; amountsIn: bigint[] }],
    "nonpayable"
  >;

  setAssetManagerPoolConfig: TypedContractMethod<
    [token: AddressLike, poolConfig: BytesLike],
    [void],
    "nonpayable"
  >;

  setSwapFeePercentage: TypedContractMethod<
    [swapFeePercentage: BigNumberish],
    [void],
    "nonpayable"
  >;

  symbol: TypedContractMethod<[], [string], "view">;

  totalSupply: TypedContractMethod<[], [bigint], "view">;

  transfer: TypedContractMethod<
    [recipient: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;

  transferFrom: TypedContractMethod<
    [sender: AddressLike, recipient: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;

  unpause: TypedContractMethod<[], [void], "nonpayable">;

  updateProtocolFeePercentageCache: TypedContractMethod<
    [],
    [void],
    "nonpayable"
  >;

  version: TypedContractMethod<[], [string], "view">;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "DELEGATE_PROTOCOL_SWAP_FEES_SENTINEL"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "DOMAIN_SEPARATOR"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "allowance"
  ): TypedContractMethod<
    [owner: AddressLike, spender: AddressLike],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "approve"
  ): TypedContractMethod<
    [spender: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "balanceOf"
  ): TypedContractMethod<[account: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "decimals"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "decreaseAllowance"
  ): TypedContractMethod<
    [spender: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "disableRecoveryMode"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "enableRecoveryMode"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "getATHRateProduct"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "getActionId"
  ): TypedContractMethod<[selector: BytesLike], [string], "view">;
  getFunction(
    nameOrSignature: "getActualSupply"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "getAuthorizer"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "getDomainSeparator"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "getInvariant"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "getLastPostJoinExitInvariant"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "getNextNonce"
  ): TypedContractMethod<[account: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "getNormalizedWeights"
  ): TypedContractMethod<[], [bigint[]], "view">;
  getFunction(
    nameOrSignature: "getOwner"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "getPausedState"
  ): TypedContractMethod<
    [],
    [
      [boolean, bigint, bigint] & {
        paused: boolean;
        pauseWindowEndTime: bigint;
        bufferPeriodEndTime: bigint;
      }
    ],
    "view"
  >;
  getFunction(
    nameOrSignature: "getPoolId"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "getProtocolFeePercentageCache"
  ): TypedContractMethod<[feeType: BigNumberish], [bigint], "view">;
  getFunction(
    nameOrSignature: "getProtocolFeesCollector"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "getProtocolSwapFeeDelegation"
  ): TypedContractMethod<[], [boolean], "view">;
  getFunction(
    nameOrSignature: "getRateProviders"
  ): TypedContractMethod<[], [string[]], "view">;
  getFunction(
    nameOrSignature: "getScalingFactors"
  ): TypedContractMethod<[], [bigint[]], "view">;
  getFunction(
    nameOrSignature: "getSwapFeePercentage"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "getVault"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "inRecoveryMode"
  ): TypedContractMethod<[], [boolean], "view">;
  getFunction(
    nameOrSignature: "increaseAllowance"
  ): TypedContractMethod<
    [spender: AddressLike, addedValue: BigNumberish],
    [boolean],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "name"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "nonces"
  ): TypedContractMethod<[owner: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "onExitPool"
  ): TypedContractMethod<
    [
      poolId: BytesLike,
      sender: AddressLike,
      recipient: AddressLike,
      balances: BigNumberish[],
      lastChangeBlock: BigNumberish,
      protocolSwapFeePercentage: BigNumberish,
      userData: BytesLike
    ],
    [[bigint[], bigint[]]],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "onJoinPool"
  ): TypedContractMethod<
    [
      poolId: BytesLike,
      sender: AddressLike,
      recipient: AddressLike,
      balances: BigNumberish[],
      lastChangeBlock: BigNumberish,
      protocolSwapFeePercentage: BigNumberish,
      userData: BytesLike
    ],
    [[bigint[], bigint[]]],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "onSwap"
  ): TypedContractMethod<
    [
      request: IPoolSwapStructs.SwapRequestStruct,
      balanceTokenIn: BigNumberish,
      balanceTokenOut: BigNumberish
    ],
    [bigint],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "pause"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "permit"
  ): TypedContractMethod<
    [
      owner: AddressLike,
      spender: AddressLike,
      value: BigNumberish,
      deadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike
    ],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "queryExit"
  ): TypedContractMethod<
    [
      poolId: BytesLike,
      sender: AddressLike,
      recipient: AddressLike,
      balances: BigNumberish[],
      lastChangeBlock: BigNumberish,
      protocolSwapFeePercentage: BigNumberish,
      userData: BytesLike
    ],
    [[bigint, bigint[]] & { bptIn: bigint; amountsOut: bigint[] }],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "queryJoin"
  ): TypedContractMethod<
    [
      poolId: BytesLike,
      sender: AddressLike,
      recipient: AddressLike,
      balances: BigNumberish[],
      lastChangeBlock: BigNumberish,
      protocolSwapFeePercentage: BigNumberish,
      userData: BytesLike
    ],
    [[bigint, bigint[]] & { bptOut: bigint; amountsIn: bigint[] }],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "setAssetManagerPoolConfig"
  ): TypedContractMethod<
    [token: AddressLike, poolConfig: BytesLike],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "setSwapFeePercentage"
  ): TypedContractMethod<
    [swapFeePercentage: BigNumberish],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "symbol"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "totalSupply"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "transfer"
  ): TypedContractMethod<
    [recipient: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "transferFrom"
  ): TypedContractMethod<
    [sender: AddressLike, recipient: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "unpause"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "updateProtocolFeePercentageCache"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "version"
  ): TypedContractMethod<[], [string], "view">;

  getEvent(
    key: "Approval"
  ): TypedContractEvent<
    ApprovalEvent.InputTuple,
    ApprovalEvent.OutputTuple,
    ApprovalEvent.OutputObject
  >;
  getEvent(
    key: "PausedStateChanged"
  ): TypedContractEvent<
    PausedStateChangedEvent.InputTuple,
    PausedStateChangedEvent.OutputTuple,
    PausedStateChangedEvent.OutputObject
  >;
  getEvent(
    key: "ProtocolFeePercentageCacheUpdated"
  ): TypedContractEvent<
    ProtocolFeePercentageCacheUpdatedEvent.InputTuple,
    ProtocolFeePercentageCacheUpdatedEvent.OutputTuple,
    ProtocolFeePercentageCacheUpdatedEvent.OutputObject
  >;
  getEvent(
    key: "RecoveryModeStateChanged"
  ): TypedContractEvent<
    RecoveryModeStateChangedEvent.InputTuple,
    RecoveryModeStateChangedEvent.OutputTuple,
    RecoveryModeStateChangedEvent.OutputObject
  >;
  getEvent(
    key: "SwapFeePercentageChanged"
  ): TypedContractEvent<
    SwapFeePercentageChangedEvent.InputTuple,
    SwapFeePercentageChangedEvent.OutputTuple,
    SwapFeePercentageChangedEvent.OutputObject
  >;
  getEvent(
    key: "Transfer"
  ): TypedContractEvent<
    TransferEvent.InputTuple,
    TransferEvent.OutputTuple,
    TransferEvent.OutputObject
  >;

  filters: {
    "Approval(address,address,uint256)": TypedContractEvent<
      ApprovalEvent.InputTuple,
      ApprovalEvent.OutputTuple,
      ApprovalEvent.OutputObject
    >;
    Approval: TypedContractEvent<
      ApprovalEvent.InputTuple,
      ApprovalEvent.OutputTuple,
      ApprovalEvent.OutputObject
    >;

    "PausedStateChanged(bool)": TypedContractEvent<
      PausedStateChangedEvent.InputTuple,
      PausedStateChangedEvent.OutputTuple,
      PausedStateChangedEvent.OutputObject
    >;
    PausedStateChanged: TypedContractEvent<
      PausedStateChangedEvent.InputTuple,
      PausedStateChangedEvent.OutputTuple,
      PausedStateChangedEvent.OutputObject
    >;

    "ProtocolFeePercentageCacheUpdated(uint256,uint256)": TypedContractEvent<
      ProtocolFeePercentageCacheUpdatedEvent.InputTuple,
      ProtocolFeePercentageCacheUpdatedEvent.OutputTuple,
      ProtocolFeePercentageCacheUpdatedEvent.OutputObject
    >;
    ProtocolFeePercentageCacheUpdated: TypedContractEvent<
      ProtocolFeePercentageCacheUpdatedEvent.InputTuple,
      ProtocolFeePercentageCacheUpdatedEvent.OutputTuple,
      ProtocolFeePercentageCacheUpdatedEvent.OutputObject
    >;

    "RecoveryModeStateChanged(bool)": TypedContractEvent<
      RecoveryModeStateChangedEvent.InputTuple,
      RecoveryModeStateChangedEvent.OutputTuple,
      RecoveryModeStateChangedEvent.OutputObject
    >;
    RecoveryModeStateChanged: TypedContractEvent<
      RecoveryModeStateChangedEvent.InputTuple,
      RecoveryModeStateChangedEvent.OutputTuple,
      RecoveryModeStateChangedEvent.OutputObject
    >;

    "SwapFeePercentageChanged(uint256)": TypedContractEvent<
      SwapFeePercentageChangedEvent.InputTuple,
      SwapFeePercentageChangedEvent.OutputTuple,
      SwapFeePercentageChangedEvent.OutputObject
    >;
    SwapFeePercentageChanged: TypedContractEvent<
      SwapFeePercentageChangedEvent.InputTuple,
      SwapFeePercentageChangedEvent.OutputTuple,
      SwapFeePercentageChangedEvent.OutputObject
    >;

    "Transfer(address,address,uint256)": TypedContractEvent<
      TransferEvent.InputTuple,
      TransferEvent.OutputTuple,
      TransferEvent.OutputObject
    >;
    Transfer: TypedContractEvent<
      TransferEvent.InputTuple,
      TransferEvent.OutputTuple,
      TransferEvent.OutputObject
    >;
  };
}