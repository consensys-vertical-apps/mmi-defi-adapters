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

export interface LpStakingInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "BONUS_MULTIPLIER"
      | "add"
      | "bonusEndBlock"
      | "deposit"
      | "emergencyWithdraw"
      | "getMultiplier"
      | "lpBalances"
      | "massUpdatePools"
      | "owner"
      | "pendingStargate"
      | "poolInfo"
      | "poolLength"
      | "renounceOwnership"
      | "set"
      | "setStargatePerBlock"
      | "stargate"
      | "stargatePerBlock"
      | "startBlock"
      | "totalAllocPoint"
      | "transferOwnership"
      | "updatePool"
      | "userInfo"
      | "withdraw"
  ): FunctionFragment;

  getEvent(
    nameOrSignatureOrTopic:
      | "Deposit"
      | "EmergencyWithdraw"
      | "OwnershipTransferred"
      | "Withdraw"
  ): EventFragment;

  encodeFunctionData(
    functionFragment: "BONUS_MULTIPLIER",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "add",
    values: [BigNumberish, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "bonusEndBlock",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "deposit",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "emergencyWithdraw",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "getMultiplier",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "lpBalances",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "massUpdatePools",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "pendingStargate",
    values: [BigNumberish, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "poolInfo",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "poolLength",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "renounceOwnership",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "set",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "setStargatePerBlock",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "stargate", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "stargatePerBlock",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "startBlock",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "totalAllocPoint",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "transferOwnership",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "updatePool",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "userInfo",
    values: [BigNumberish, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "withdraw",
    values: [BigNumberish, BigNumberish]
  ): string;

  decodeFunctionResult(
    functionFragment: "BONUS_MULTIPLIER",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "add", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "bonusEndBlock",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "deposit", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "emergencyWithdraw",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getMultiplier",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "lpBalances", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "massUpdatePools",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "pendingStargate",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "poolInfo", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "poolLength", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "renounceOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "set", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "setStargatePerBlock",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "stargate", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "stargatePerBlock",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "startBlock", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "totalAllocPoint",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "transferOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "updatePool", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "userInfo", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "withdraw", data: BytesLike): Result;
}

export namespace DepositEvent {
  export type InputTuple = [
    user: AddressLike,
    pid: BigNumberish,
    amount: BigNumberish
  ];
  export type OutputTuple = [user: string, pid: bigint, amount: bigint];
  export interface OutputObject {
    user: string;
    pid: bigint;
    amount: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace EmergencyWithdrawEvent {
  export type InputTuple = [
    user: AddressLike,
    pid: BigNumberish,
    amount: BigNumberish
  ];
  export type OutputTuple = [user: string, pid: bigint, amount: bigint];
  export interface OutputObject {
    user: string;
    pid: bigint;
    amount: bigint;
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

export namespace WithdrawEvent {
  export type InputTuple = [
    user: AddressLike,
    pid: BigNumberish,
    amount: BigNumberish
  ];
  export type OutputTuple = [user: string, pid: bigint, amount: bigint];
  export interface OutputObject {
    user: string;
    pid: bigint;
    amount: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface LpStaking extends BaseContract {
  connect(runner?: ContractRunner | null): LpStaking;
  waitForDeployment(): Promise<this>;

  interface: LpStakingInterface;

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

  BONUS_MULTIPLIER: TypedContractMethod<[], [bigint], "view">;

  add: TypedContractMethod<
    [_allocPoint: BigNumberish, _lpToken: AddressLike],
    [void],
    "nonpayable"
  >;

  bonusEndBlock: TypedContractMethod<[], [bigint], "view">;

  deposit: TypedContractMethod<
    [_pid: BigNumberish, _amount: BigNumberish],
    [void],
    "nonpayable"
  >;

  emergencyWithdraw: TypedContractMethod<
    [_pid: BigNumberish],
    [void],
    "nonpayable"
  >;

  getMultiplier: TypedContractMethod<
    [_from: BigNumberish, _to: BigNumberish],
    [bigint],
    "view"
  >;

  lpBalances: TypedContractMethod<[arg0: BigNumberish], [bigint], "view">;

  massUpdatePools: TypedContractMethod<[], [void], "nonpayable">;

  owner: TypedContractMethod<[], [string], "view">;

  pendingStargate: TypedContractMethod<
    [_pid: BigNumberish, _user: AddressLike],
    [bigint],
    "view"
  >;

  poolInfo: TypedContractMethod<
    [arg0: BigNumberish],
    [
      [string, bigint, bigint, bigint] & {
        lpToken: string;
        allocPoint: bigint;
        lastRewardBlock: bigint;
        accStargatePerShare: bigint;
      }
    ],
    "view"
  >;

  poolLength: TypedContractMethod<[], [bigint], "view">;

  renounceOwnership: TypedContractMethod<[], [void], "nonpayable">;

  set: TypedContractMethod<
    [_pid: BigNumberish, _allocPoint: BigNumberish],
    [void],
    "nonpayable"
  >;

  setStargatePerBlock: TypedContractMethod<
    [_stargatePerBlock: BigNumberish],
    [void],
    "nonpayable"
  >;

  stargate: TypedContractMethod<[], [string], "view">;

  stargatePerBlock: TypedContractMethod<[], [bigint], "view">;

  startBlock: TypedContractMethod<[], [bigint], "view">;

  totalAllocPoint: TypedContractMethod<[], [bigint], "view">;

  transferOwnership: TypedContractMethod<
    [newOwner: AddressLike],
    [void],
    "nonpayable"
  >;

  updatePool: TypedContractMethod<[_pid: BigNumberish], [void], "nonpayable">;

  userInfo: TypedContractMethod<
    [arg0: BigNumberish, arg1: AddressLike],
    [[bigint, bigint] & { amount: bigint; rewardDebt: bigint }],
    "view"
  >;

  withdraw: TypedContractMethod<
    [_pid: BigNumberish, _amount: BigNumberish],
    [void],
    "nonpayable"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "BONUS_MULTIPLIER"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "add"
  ): TypedContractMethod<
    [_allocPoint: BigNumberish, _lpToken: AddressLike],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "bonusEndBlock"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "deposit"
  ): TypedContractMethod<
    [_pid: BigNumberish, _amount: BigNumberish],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "emergencyWithdraw"
  ): TypedContractMethod<[_pid: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "getMultiplier"
  ): TypedContractMethod<
    [_from: BigNumberish, _to: BigNumberish],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "lpBalances"
  ): TypedContractMethod<[arg0: BigNumberish], [bigint], "view">;
  getFunction(
    nameOrSignature: "massUpdatePools"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "owner"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "pendingStargate"
  ): TypedContractMethod<
    [_pid: BigNumberish, _user: AddressLike],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "poolInfo"
  ): TypedContractMethod<
    [arg0: BigNumberish],
    [
      [string, bigint, bigint, bigint] & {
        lpToken: string;
        allocPoint: bigint;
        lastRewardBlock: bigint;
        accStargatePerShare: bigint;
      }
    ],
    "view"
  >;
  getFunction(
    nameOrSignature: "poolLength"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "renounceOwnership"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "set"
  ): TypedContractMethod<
    [_pid: BigNumberish, _allocPoint: BigNumberish],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "setStargatePerBlock"
  ): TypedContractMethod<
    [_stargatePerBlock: BigNumberish],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "stargate"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "stargatePerBlock"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "startBlock"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "totalAllocPoint"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "transferOwnership"
  ): TypedContractMethod<[newOwner: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "updatePool"
  ): TypedContractMethod<[_pid: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "userInfo"
  ): TypedContractMethod<
    [arg0: BigNumberish, arg1: AddressLike],
    [[bigint, bigint] & { amount: bigint; rewardDebt: bigint }],
    "view"
  >;
  getFunction(
    nameOrSignature: "withdraw"
  ): TypedContractMethod<
    [_pid: BigNumberish, _amount: BigNumberish],
    [void],
    "nonpayable"
  >;

  getEvent(
    key: "Deposit"
  ): TypedContractEvent<
    DepositEvent.InputTuple,
    DepositEvent.OutputTuple,
    DepositEvent.OutputObject
  >;
  getEvent(
    key: "EmergencyWithdraw"
  ): TypedContractEvent<
    EmergencyWithdrawEvent.InputTuple,
    EmergencyWithdrawEvent.OutputTuple,
    EmergencyWithdrawEvent.OutputObject
  >;
  getEvent(
    key: "OwnershipTransferred"
  ): TypedContractEvent<
    OwnershipTransferredEvent.InputTuple,
    OwnershipTransferredEvent.OutputTuple,
    OwnershipTransferredEvent.OutputObject
  >;
  getEvent(
    key: "Withdraw"
  ): TypedContractEvent<
    WithdrawEvent.InputTuple,
    WithdrawEvent.OutputTuple,
    WithdrawEvent.OutputObject
  >;

  filters: {
    "Deposit(address,uint256,uint256)": TypedContractEvent<
      DepositEvent.InputTuple,
      DepositEvent.OutputTuple,
      DepositEvent.OutputObject
    >;
    Deposit: TypedContractEvent<
      DepositEvent.InputTuple,
      DepositEvent.OutputTuple,
      DepositEvent.OutputObject
    >;

    "EmergencyWithdraw(address,uint256,uint256)": TypedContractEvent<
      EmergencyWithdrawEvent.InputTuple,
      EmergencyWithdrawEvent.OutputTuple,
      EmergencyWithdrawEvent.OutputObject
    >;
    EmergencyWithdraw: TypedContractEvent<
      EmergencyWithdrawEvent.InputTuple,
      EmergencyWithdrawEvent.OutputTuple,
      EmergencyWithdrawEvent.OutputObject
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

    "Withdraw(address,uint256,uint256)": TypedContractEvent<
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
