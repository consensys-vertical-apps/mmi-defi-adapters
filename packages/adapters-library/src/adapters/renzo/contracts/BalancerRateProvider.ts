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

export interface BalancerRateProviderInterface extends Interface {
  getFunction(
    nameOrSignature: "ezETHToken" | "getRate" | "initialize" | "restakeManager"
  ): FunctionFragment;

  getEvent(nameOrSignatureOrTopic: "Initialized"): EventFragment;

  encodeFunctionData(
    functionFragment: "ezETHToken",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "getRate", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "initialize",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "restakeManager",
    values?: undefined
  ): string;

  decodeFunctionResult(functionFragment: "ezETHToken", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getRate", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "initialize", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "restakeManager",
    data: BytesLike
  ): Result;
}

export namespace InitializedEvent {
  export type InputTuple = [version: BigNumberish];
  export type OutputTuple = [version: bigint];
  export interface OutputObject {
    version: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface BalancerRateProvider extends BaseContract {
  connect(runner?: ContractRunner | null): BalancerRateProvider;
  waitForDeployment(): Promise<this>;

  interface: BalancerRateProviderInterface;

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

  ezETHToken: TypedContractMethod<[], [string], "view">;

  getRate: TypedContractMethod<[], [bigint], "view">;

  initialize: TypedContractMethod<
    [_restakeManager: AddressLike, _ezETHToken: AddressLike],
    [void],
    "nonpayable"
  >;

  restakeManager: TypedContractMethod<[], [string], "view">;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "ezETHToken"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "getRate"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "initialize"
  ): TypedContractMethod<
    [_restakeManager: AddressLike, _ezETHToken: AddressLike],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "restakeManager"
  ): TypedContractMethod<[], [string], "view">;

  getEvent(
    key: "Initialized"
  ): TypedContractEvent<
    InitializedEvent.InputTuple,
    InitializedEvent.OutputTuple,
    InitializedEvent.OutputObject
  >;

  filters: {
    "Initialized(uint8)": TypedContractEvent<
      InitializedEvent.InputTuple,
      InitializedEvent.OutputTuple,
      InitializedEvent.OutputObject
    >;
    Initialized: TypedContractEvent<
      InitializedEvent.InputTuple,
      InitializedEvent.OutputTuple,
      InitializedEvent.OutputObject
    >;
  };
}
