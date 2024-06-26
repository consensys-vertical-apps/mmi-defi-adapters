/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedListener,
  TypedContractMethod,
} from "./common";

export interface BalancerPoolInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "getVault"
      | "getPoolId"
      | "getActualSupply"
      | "totalSupply"
  ): FunctionFragment;

  encodeFunctionData(functionFragment: "getVault", values?: undefined): string;
  encodeFunctionData(functionFragment: "getPoolId", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "getActualSupply",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "totalSupply",
    values?: undefined
  ): string;

  decodeFunctionResult(functionFragment: "getVault", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getPoolId", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "getActualSupply",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "totalSupply",
    data: BytesLike
  ): Result;
}

export interface BalancerPool extends BaseContract {
  connect(runner?: ContractRunner | null): BalancerPool;
  waitForDeployment(): Promise<this>;

  interface: BalancerPoolInterface;

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

  getVault: TypedContractMethod<[], [string], "view">;

  getPoolId: TypedContractMethod<[], [string], "view">;

  getActualSupply: TypedContractMethod<[], [bigint], "view">;

  totalSupply: TypedContractMethod<[], [bigint], "view">;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "getVault"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "getPoolId"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "getActualSupply"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "totalSupply"
  ): TypedContractMethod<[], [bigint], "view">;

  filters: {};
}
