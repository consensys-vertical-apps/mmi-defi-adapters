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

export interface BalMinterInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "allowed_to_mint_for"
      | "getBalancerToken"
      | "getBalancerTokenAdmin"
      | "getDomainSeparator"
      | "getGaugeController"
      | "getMinterApproval"
      | "getNextNonce"
      | "mint"
      | "mintFor"
      | "mintMany"
      | "mintManyFor"
      | "mint_for"
      | "mint_many"
      | "minted"
      | "setMinterApproval"
      | "setMinterApprovalWithSignature"
      | "toggle_approve_mint"
  ): FunctionFragment;

  getEvent(
    nameOrSignatureOrTopic: "Minted" | "MinterApprovalSet"
  ): EventFragment;

  encodeFunctionData(
    functionFragment: "allowed_to_mint_for",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "getBalancerToken",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getBalancerTokenAdmin",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getDomainSeparator",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getGaugeController",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getMinterApproval",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "getNextNonce",
    values: [AddressLike]
  ): string;
  encodeFunctionData(functionFragment: "mint", values: [AddressLike]): string;
  encodeFunctionData(
    functionFragment: "mintFor",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "mintMany",
    values: [AddressLike[]]
  ): string;
  encodeFunctionData(
    functionFragment: "mintManyFor",
    values: [AddressLike[], AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "mint_for",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "mint_many",
    values: [AddressLike[]]
  ): string;
  encodeFunctionData(
    functionFragment: "minted",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "setMinterApproval",
    values: [AddressLike, boolean]
  ): string;
  encodeFunctionData(
    functionFragment: "setMinterApprovalWithSignature",
    values: [
      AddressLike,
      boolean,
      AddressLike,
      BigNumberish,
      BigNumberish,
      BytesLike,
      BytesLike
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "toggle_approve_mint",
    values: [AddressLike]
  ): string;

  decodeFunctionResult(
    functionFragment: "allowed_to_mint_for",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getBalancerToken",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getBalancerTokenAdmin",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getDomainSeparator",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getGaugeController",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getMinterApproval",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getNextNonce",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "mint", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "mintFor", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "mintMany", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "mintManyFor",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "mint_for", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "mint_many", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "minted", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "setMinterApproval",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setMinterApprovalWithSignature",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "toggle_approve_mint",
    data: BytesLike
  ): Result;
}

export namespace MintedEvent {
  export type InputTuple = [
    recipient: AddressLike,
    gauge: AddressLike,
    minted: BigNumberish
  ];
  export type OutputTuple = [recipient: string, gauge: string, minted: bigint];
  export interface OutputObject {
    recipient: string;
    gauge: string;
    minted: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace MinterApprovalSetEvent {
  export type InputTuple = [
    user: AddressLike,
    minter: AddressLike,
    approval: boolean
  ];
  export type OutputTuple = [user: string, minter: string, approval: boolean];
  export interface OutputObject {
    user: string;
    minter: string;
    approval: boolean;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface BalMinter extends BaseContract {
  connect(runner?: ContractRunner | null): BalMinter;
  waitForDeployment(): Promise<this>;

  interface: BalMinterInterface;

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

  allowed_to_mint_for: TypedContractMethod<
    [minter: AddressLike, user: AddressLike],
    [boolean],
    "view"
  >;

  getBalancerToken: TypedContractMethod<[], [string], "view">;

  getBalancerTokenAdmin: TypedContractMethod<[], [string], "view">;

  getDomainSeparator: TypedContractMethod<[], [string], "view">;

  getGaugeController: TypedContractMethod<[], [string], "view">;

  getMinterApproval: TypedContractMethod<
    [minter: AddressLike, user: AddressLike],
    [boolean],
    "view"
  >;

  getNextNonce: TypedContractMethod<[user: AddressLike], [bigint], "view">;

  mint: TypedContractMethod<[gauge: AddressLike], [bigint], "nonpayable">;

  mintFor: TypedContractMethod<
    [gauge: AddressLike, user: AddressLike],
    [bigint],
    "nonpayable"
  >;

  mintMany: TypedContractMethod<
    [gauges: AddressLike[]],
    [bigint],
    "nonpayable"
  >;

  mintManyFor: TypedContractMethod<
    [gauges: AddressLike[], user: AddressLike],
    [bigint],
    "nonpayable"
  >;

  mint_for: TypedContractMethod<
    [gauge: AddressLike, user: AddressLike],
    [void],
    "nonpayable"
  >;

  mint_many: TypedContractMethod<[gauges: AddressLike[]], [void], "nonpayable">;

  minted: TypedContractMethod<
    [user: AddressLike, gauge: AddressLike],
    [bigint],
    "view"
  >;

  setMinterApproval: TypedContractMethod<
    [minter: AddressLike, approval: boolean],
    [void],
    "nonpayable"
  >;

  setMinterApprovalWithSignature: TypedContractMethod<
    [
      minter: AddressLike,
      approval: boolean,
      user: AddressLike,
      deadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike
    ],
    [void],
    "nonpayable"
  >;

  toggle_approve_mint: TypedContractMethod<
    [minter: AddressLike],
    [void],
    "nonpayable"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "allowed_to_mint_for"
  ): TypedContractMethod<
    [minter: AddressLike, user: AddressLike],
    [boolean],
    "view"
  >;
  getFunction(
    nameOrSignature: "getBalancerToken"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "getBalancerTokenAdmin"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "getDomainSeparator"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "getGaugeController"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "getMinterApproval"
  ): TypedContractMethod<
    [minter: AddressLike, user: AddressLike],
    [boolean],
    "view"
  >;
  getFunction(
    nameOrSignature: "getNextNonce"
  ): TypedContractMethod<[user: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "mint"
  ): TypedContractMethod<[gauge: AddressLike], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "mintFor"
  ): TypedContractMethod<
    [gauge: AddressLike, user: AddressLike],
    [bigint],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "mintMany"
  ): TypedContractMethod<[gauges: AddressLike[]], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "mintManyFor"
  ): TypedContractMethod<
    [gauges: AddressLike[], user: AddressLike],
    [bigint],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "mint_for"
  ): TypedContractMethod<
    [gauge: AddressLike, user: AddressLike],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "mint_many"
  ): TypedContractMethod<[gauges: AddressLike[]], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "minted"
  ): TypedContractMethod<
    [user: AddressLike, gauge: AddressLike],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "setMinterApproval"
  ): TypedContractMethod<
    [minter: AddressLike, approval: boolean],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "setMinterApprovalWithSignature"
  ): TypedContractMethod<
    [
      minter: AddressLike,
      approval: boolean,
      user: AddressLike,
      deadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike
    ],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "toggle_approve_mint"
  ): TypedContractMethod<[minter: AddressLike], [void], "nonpayable">;

  getEvent(
    key: "Minted"
  ): TypedContractEvent<
    MintedEvent.InputTuple,
    MintedEvent.OutputTuple,
    MintedEvent.OutputObject
  >;
  getEvent(
    key: "MinterApprovalSet"
  ): TypedContractEvent<
    MinterApprovalSetEvent.InputTuple,
    MinterApprovalSetEvent.OutputTuple,
    MinterApprovalSetEvent.OutputObject
  >;

  filters: {
    "Minted(address,address,uint256)": TypedContractEvent<
      MintedEvent.InputTuple,
      MintedEvent.OutputTuple,
      MintedEvent.OutputObject
    >;
    Minted: TypedContractEvent<
      MintedEvent.InputTuple,
      MintedEvent.OutputTuple,
      MintedEvent.OutputObject
    >;

    "MinterApprovalSet(address,address,bool)": TypedContractEvent<
      MinterApprovalSetEvent.InputTuple,
      MinterApprovalSetEvent.OutputTuple,
      MinterApprovalSetEvent.OutputObject
    >;
    MinterApprovalSet: TypedContractEvent<
      MinterApprovalSetEvent.InputTuple,
      MinterApprovalSetEvent.OutputTuple,
      MinterApprovalSetEvent.OutputObject
    >;
  };
}