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

export interface SMendiInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "MANTISSA2"
      | "_setClaimable"
      | "_setWithdrawalPendingTime"
      | "_whitelistToken"
      | "allowance"
      | "approve"
      | "balanceOf"
      | "burn"
      | "claim"
      | "claimAll"
      | "claimable"
      | "decimals"
      | "decreaseAllowance"
      | "getTokens"
      | "increaseAllowance"
      | "initialize"
      | "mint"
      | "name"
      | "owner"
      | "recipients"
      | "renounceOwnership"
      | "shareIndex"
      | "shares"
      | "symbol"
      | "tokenExists"
      | "tokens"
      | "totalShares"
      | "totalSupply"
      | "transfer"
      | "transferFrom"
      | "transferOwnership"
      | "underlying"
      | "updateCredit"
      | "updateShareIndex"
      | "withdraw"
      | "withdrawal"
      | "withdrawalPendingTime"
  ): FunctionFragment;

  getEvent(
    nameOrSignatureOrTopic:
      | "Approval"
      | "Claim"
      | "ClaimableUpdate"
      | "EditRecipient"
      | "Initialized"
      | "OwnershipTransferred"
      | "Transfer"
      | "UpdateCredit"
      | "UpdateShareIndex"
      | "Withdraw"
  ): EventFragment;

  encodeFunctionData(functionFragment: "MANTISSA2", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "_setClaimable",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "_setWithdrawalPendingTime",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "_whitelistToken",
    values: [AddressLike]
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
  encodeFunctionData(functionFragment: "burn", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "claim", values: [AddressLike]): string;
  encodeFunctionData(functionFragment: "claimAll", values?: undefined): string;
  encodeFunctionData(functionFragment: "claimable", values?: undefined): string;
  encodeFunctionData(functionFragment: "decimals", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "decreaseAllowance",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "getTokens", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "increaseAllowance",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "initialize",
    values: [AddressLike, string, string, AddressLike]
  ): string;
  encodeFunctionData(functionFragment: "mint", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "name", values?: undefined): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "recipients",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "renounceOwnership",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "shareIndex",
    values: [AddressLike]
  ): string;
  encodeFunctionData(functionFragment: "shares", values: [AddressLike]): string;
  encodeFunctionData(functionFragment: "symbol", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "tokenExists",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "tokens",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "totalShares",
    values?: undefined
  ): string;
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
  encodeFunctionData(
    functionFragment: "transferOwnership",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "underlying",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "updateCredit",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "updateShareIndex",
    values: [AddressLike]
  ): string;
  encodeFunctionData(functionFragment: "withdraw", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "withdrawal",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "withdrawalPendingTime",
    values?: undefined
  ): string;

  decodeFunctionResult(functionFragment: "MANTISSA2", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "_setClaimable",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_setWithdrawalPendingTime",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_whitelistToken",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "allowance", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "approve", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "balanceOf", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "burn", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "claim", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "claimAll", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "claimable", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "decimals", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "decreaseAllowance",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "getTokens", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "increaseAllowance",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "initialize", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "mint", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "name", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "recipients", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "renounceOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "shareIndex", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "shares", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "symbol", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "tokenExists",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "tokens", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "totalShares",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "totalSupply",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "transfer", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "transferFrom",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "transferOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "underlying", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "updateCredit",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "updateShareIndex",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "withdraw", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "withdrawal", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "withdrawalPendingTime",
    data: BytesLike
  ): Result;
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

export namespace ClaimEvent {
  export type InputTuple = [
    token: AddressLike,
    account: AddressLike,
    amount: BigNumberish
  ];
  export type OutputTuple = [token: string, account: string, amount: bigint];
  export interface OutputObject {
    token: string;
    account: string;
    amount: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace ClaimableUpdateEvent {
  export type InputTuple = [
    oldClaimable: AddressLike,
    newClaimable: AddressLike
  ];
  export type OutputTuple = [oldClaimable: string, newClaimable: string];
  export interface OutputObject {
    oldClaimable: string;
    newClaimable: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace EditRecipientEvent {
  export type InputTuple = [
    account: AddressLike,
    shares: BigNumberish,
    totalShares: BigNumberish
  ];
  export type OutputTuple = [
    account: string,
    shares: bigint,
    totalShares: bigint
  ];
  export interface OutputObject {
    account: string;
    shares: bigint;
    totalShares: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
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

export namespace OwnershipTransferredEvent {
  export type InputTuple = [previousOwner: AddressLike, newOwner: AddressLike];
  export type OutputTuple = [previousOwner: string, newOwner: string];
  export interface OutputObject {
    previousOwner: string;
    newOwner: string;
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

export namespace UpdateCreditEvent {
  export type InputTuple = [
    token: AddressLike,
    account: AddressLike,
    lastShareIndex: BigNumberish,
    credit: BigNumberish
  ];
  export type OutputTuple = [
    token: string,
    account: string,
    lastShareIndex: bigint,
    credit: bigint
  ];
  export interface OutputObject {
    token: string;
    account: string;
    lastShareIndex: bigint;
    credit: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace UpdateShareIndexEvent {
  export type InputTuple = [token: AddressLike, shareIndex: BigNumberish];
  export type OutputTuple = [token: string, shareIndex: bigint];
  export interface OutputObject {
    token: string;
    shareIndex: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace WithdrawEvent {
  export type InputTuple = [user: AddressLike, amount: BigNumberish];
  export type OutputTuple = [user: string, amount: bigint];
  export interface OutputObject {
    user: string;
    amount: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface SMendi extends BaseContract {
  connect(runner?: ContractRunner | null): SMendi;
  waitForDeployment(): Promise<this>;

  interface: SMendiInterface;

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

  MANTISSA2: TypedContractMethod<[], [bigint], "view">;

  _setClaimable: TypedContractMethod<
    [newClaimable: AddressLike],
    [void],
    "nonpayable"
  >;

  _setWithdrawalPendingTime: TypedContractMethod<
    [withdrawalPendingTime_: BigNumberish],
    [void],
    "nonpayable"
  >;

  _whitelistToken: TypedContractMethod<
    [token_: AddressLike],
    [void],
    "nonpayable"
  >;

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

  burn: TypedContractMethod<[amount: BigNumberish], [void], "nonpayable">;

  claim: TypedContractMethod<[token: AddressLike], [bigint], "nonpayable">;

  claimAll: TypedContractMethod<[], [bigint[]], "nonpayable">;

  claimable: TypedContractMethod<[], [string], "view">;

  decimals: TypedContractMethod<[], [bigint], "view">;

  decreaseAllowance: TypedContractMethod<
    [spender: AddressLike, subtractedValue: BigNumberish],
    [boolean],
    "nonpayable"
  >;

  getTokens: TypedContractMethod<[], [string[]], "view">;

  increaseAllowance: TypedContractMethod<
    [spender: AddressLike, addedValue: BigNumberish],
    [boolean],
    "nonpayable"
  >;

  initialize: TypedContractMethod<
    [
      claimable_: AddressLike,
      name: string,
      symbol: string,
      underlying_: AddressLike
    ],
    [void],
    "nonpayable"
  >;

  mint: TypedContractMethod<[amount: BigNumberish], [void], "nonpayable">;

  name: TypedContractMethod<[], [string], "view">;

  owner: TypedContractMethod<[], [string], "view">;

  recipients: TypedContractMethod<
    [arg0: AddressLike, arg1: AddressLike],
    [[bigint, bigint] & { lastShareIndex: bigint; credit: bigint }],
    "view"
  >;

  renounceOwnership: TypedContractMethod<[], [void], "nonpayable">;

  shareIndex: TypedContractMethod<[arg0: AddressLike], [bigint], "view">;

  shares: TypedContractMethod<[arg0: AddressLike], [bigint], "view">;

  symbol: TypedContractMethod<[], [string], "view">;

  tokenExists: TypedContractMethod<[arg0: AddressLike], [boolean], "view">;

  tokens: TypedContractMethod<[arg0: BigNumberish], [string], "view">;

  totalShares: TypedContractMethod<[], [bigint], "view">;

  totalSupply: TypedContractMethod<[], [bigint], "view">;

  transfer: TypedContractMethod<
    [to: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;

  transferFrom: TypedContractMethod<
    [from: AddressLike, to: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;

  transferOwnership: TypedContractMethod<
    [newOwner: AddressLike],
    [void],
    "nonpayable"
  >;

  underlying: TypedContractMethod<[], [string], "view">;

  updateCredit: TypedContractMethod<
    [token: AddressLike, account: AddressLike],
    [bigint],
    "nonpayable"
  >;

  updateShareIndex: TypedContractMethod<
    [token: AddressLike],
    [bigint],
    "nonpayable"
  >;

  withdraw: TypedContractMethod<[], [void], "nonpayable">;

  withdrawal: TypedContractMethod<
    [arg0: AddressLike],
    [[bigint, bigint] & { amount: bigint; releaseTime: bigint }],
    "view"
  >;

  withdrawalPendingTime: TypedContractMethod<[], [bigint], "view">;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "MANTISSA2"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "_setClaimable"
  ): TypedContractMethod<[newClaimable: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "_setWithdrawalPendingTime"
  ): TypedContractMethod<
    [withdrawalPendingTime_: BigNumberish],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "_whitelistToken"
  ): TypedContractMethod<[token_: AddressLike], [void], "nonpayable">;
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
    nameOrSignature: "burn"
  ): TypedContractMethod<[amount: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "claim"
  ): TypedContractMethod<[token: AddressLike], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "claimAll"
  ): TypedContractMethod<[], [bigint[]], "nonpayable">;
  getFunction(
    nameOrSignature: "claimable"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "decimals"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "decreaseAllowance"
  ): TypedContractMethod<
    [spender: AddressLike, subtractedValue: BigNumberish],
    [boolean],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "getTokens"
  ): TypedContractMethod<[], [string[]], "view">;
  getFunction(
    nameOrSignature: "increaseAllowance"
  ): TypedContractMethod<
    [spender: AddressLike, addedValue: BigNumberish],
    [boolean],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "initialize"
  ): TypedContractMethod<
    [
      claimable_: AddressLike,
      name: string,
      symbol: string,
      underlying_: AddressLike
    ],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "mint"
  ): TypedContractMethod<[amount: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "name"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "owner"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "recipients"
  ): TypedContractMethod<
    [arg0: AddressLike, arg1: AddressLike],
    [[bigint, bigint] & { lastShareIndex: bigint; credit: bigint }],
    "view"
  >;
  getFunction(
    nameOrSignature: "renounceOwnership"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "shareIndex"
  ): TypedContractMethod<[arg0: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "shares"
  ): TypedContractMethod<[arg0: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "symbol"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "tokenExists"
  ): TypedContractMethod<[arg0: AddressLike], [boolean], "view">;
  getFunction(
    nameOrSignature: "tokens"
  ): TypedContractMethod<[arg0: BigNumberish], [string], "view">;
  getFunction(
    nameOrSignature: "totalShares"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "totalSupply"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "transfer"
  ): TypedContractMethod<
    [to: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "transferFrom"
  ): TypedContractMethod<
    [from: AddressLike, to: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "transferOwnership"
  ): TypedContractMethod<[newOwner: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "underlying"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "updateCredit"
  ): TypedContractMethod<
    [token: AddressLike, account: AddressLike],
    [bigint],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "updateShareIndex"
  ): TypedContractMethod<[token: AddressLike], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "withdraw"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "withdrawal"
  ): TypedContractMethod<
    [arg0: AddressLike],
    [[bigint, bigint] & { amount: bigint; releaseTime: bigint }],
    "view"
  >;
  getFunction(
    nameOrSignature: "withdrawalPendingTime"
  ): TypedContractMethod<[], [bigint], "view">;

  getEvent(
    key: "Approval"
  ): TypedContractEvent<
    ApprovalEvent.InputTuple,
    ApprovalEvent.OutputTuple,
    ApprovalEvent.OutputObject
  >;
  getEvent(
    key: "Claim"
  ): TypedContractEvent<
    ClaimEvent.InputTuple,
    ClaimEvent.OutputTuple,
    ClaimEvent.OutputObject
  >;
  getEvent(
    key: "ClaimableUpdate"
  ): TypedContractEvent<
    ClaimableUpdateEvent.InputTuple,
    ClaimableUpdateEvent.OutputTuple,
    ClaimableUpdateEvent.OutputObject
  >;
  getEvent(
    key: "EditRecipient"
  ): TypedContractEvent<
    EditRecipientEvent.InputTuple,
    EditRecipientEvent.OutputTuple,
    EditRecipientEvent.OutputObject
  >;
  getEvent(
    key: "Initialized"
  ): TypedContractEvent<
    InitializedEvent.InputTuple,
    InitializedEvent.OutputTuple,
    InitializedEvent.OutputObject
  >;
  getEvent(
    key: "OwnershipTransferred"
  ): TypedContractEvent<
    OwnershipTransferredEvent.InputTuple,
    OwnershipTransferredEvent.OutputTuple,
    OwnershipTransferredEvent.OutputObject
  >;
  getEvent(
    key: "Transfer"
  ): TypedContractEvent<
    TransferEvent.InputTuple,
    TransferEvent.OutputTuple,
    TransferEvent.OutputObject
  >;
  getEvent(
    key: "UpdateCredit"
  ): TypedContractEvent<
    UpdateCreditEvent.InputTuple,
    UpdateCreditEvent.OutputTuple,
    UpdateCreditEvent.OutputObject
  >;
  getEvent(
    key: "UpdateShareIndex"
  ): TypedContractEvent<
    UpdateShareIndexEvent.InputTuple,
    UpdateShareIndexEvent.OutputTuple,
    UpdateShareIndexEvent.OutputObject
  >;
  getEvent(
    key: "Withdraw"
  ): TypedContractEvent<
    WithdrawEvent.InputTuple,
    WithdrawEvent.OutputTuple,
    WithdrawEvent.OutputObject
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

    "Claim(address,address,uint256)": TypedContractEvent<
      ClaimEvent.InputTuple,
      ClaimEvent.OutputTuple,
      ClaimEvent.OutputObject
    >;
    Claim: TypedContractEvent<
      ClaimEvent.InputTuple,
      ClaimEvent.OutputTuple,
      ClaimEvent.OutputObject
    >;

    "ClaimableUpdate(address,address)": TypedContractEvent<
      ClaimableUpdateEvent.InputTuple,
      ClaimableUpdateEvent.OutputTuple,
      ClaimableUpdateEvent.OutputObject
    >;
    ClaimableUpdate: TypedContractEvent<
      ClaimableUpdateEvent.InputTuple,
      ClaimableUpdateEvent.OutputTuple,
      ClaimableUpdateEvent.OutputObject
    >;

    "EditRecipient(address,uint256,uint256)": TypedContractEvent<
      EditRecipientEvent.InputTuple,
      EditRecipientEvent.OutputTuple,
      EditRecipientEvent.OutputObject
    >;
    EditRecipient: TypedContractEvent<
      EditRecipientEvent.InputTuple,
      EditRecipientEvent.OutputTuple,
      EditRecipientEvent.OutputObject
    >;

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

    "OwnershipTransferred(address,address)": TypedContractEvent<
      OwnershipTransferredEvent.InputTuple,
      OwnershipTransferredEvent.OutputTuple,
      OwnershipTransferredEvent.OutputObject
    >;
    OwnershipTransferred: TypedContractEvent<
      OwnershipTransferredEvent.InputTuple,
      OwnershipTransferredEvent.OutputTuple,
      OwnershipTransferredEvent.OutputObject
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

    "UpdateCredit(address,address,uint256,uint256)": TypedContractEvent<
      UpdateCreditEvent.InputTuple,
      UpdateCreditEvent.OutputTuple,
      UpdateCreditEvent.OutputObject
    >;
    UpdateCredit: TypedContractEvent<
      UpdateCreditEvent.InputTuple,
      UpdateCreditEvent.OutputTuple,
      UpdateCreditEvent.OutputObject
    >;

    "UpdateShareIndex(address,uint256)": TypedContractEvent<
      UpdateShareIndexEvent.InputTuple,
      UpdateShareIndexEvent.OutputTuple,
      UpdateShareIndexEvent.OutputObject
    >;
    UpdateShareIndex: TypedContractEvent<
      UpdateShareIndexEvent.InputTuple,
      UpdateShareIndexEvent.OutputTuple,
      UpdateShareIndexEvent.OutputObject
    >;

    "Withdraw(address,uint256)": TypedContractEvent<
      WithdrawEvent.InputTuple,
      WithdrawEvent.OutputTuple,
      WithdrawEvent.OutputObject
    >;
    Withdraw: TypedContractEvent<
      WithdrawEvent.InputTuple,
      WithdrawEvent.OutputTuple,
      WithdrawEvent.OutputObject
    >;
  };
}
