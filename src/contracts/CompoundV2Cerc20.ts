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

export interface CompoundV2Cerc20Interface extends Interface {
  getFunction(
    nameOrSignature:
      | "name"
      | "approve"
      | "repayBorrow"
      | "reserveFactorMantissa"
      | "borrowBalanceCurrent"
      | "totalSupply"
      | "exchangeRateStored"
      | "transferFrom"
      | "repayBorrowBehalf"
      | "pendingAdmin"
      | "decimals"
      | "balanceOfUnderlying"
      | "getCash"
      | "_setComptroller"
      | "totalBorrows"
      | "comptroller"
      | "_reduceReserves"
      | "initialExchangeRateMantissa"
      | "accrualBlockNumber"
      | "underlying"
      | "balanceOf"
      | "totalBorrowsCurrent"
      | "redeemUnderlying"
      | "totalReserves"
      | "symbol"
      | "borrowBalanceStored"
      | "mint"
      | "accrueInterest"
      | "transfer"
      | "borrowIndex"
      | "supplyRatePerBlock"
      | "seize"
      | "_setPendingAdmin"
      | "exchangeRateCurrent"
      | "getAccountSnapshot"
      | "borrow"
      | "redeem"
      | "allowance"
      | "_acceptAdmin"
      | "_setInterestRateModel"
      | "interestRateModel"
      | "liquidateBorrow"
      | "admin"
      | "borrowRatePerBlock"
      | "_setReserveFactor"
      | "isCToken"
  ): FunctionFragment;

  getEvent(
    nameOrSignatureOrTopic:
      | "AccrueInterest"
      | "Mint"
      | "Redeem"
      | "Borrow"
      | "RepayBorrow"
      | "LiquidateBorrow"
      | "NewPendingAdmin"
      | "NewAdmin"
      | "NewComptroller"
      | "NewMarketInterestRateModel"
      | "NewReserveFactor"
      | "ReservesReduced"
      | "Failure"
      | "Transfer"
      | "Approval"
  ): EventFragment;

  encodeFunctionData(functionFragment: "name", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "approve",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "repayBorrow",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "reserveFactorMantissa",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "borrowBalanceCurrent",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "totalSupply",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "exchangeRateStored",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "transferFrom",
    values: [AddressLike, AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "repayBorrowBehalf",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "pendingAdmin",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "decimals", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "balanceOfUnderlying",
    values: [AddressLike]
  ): string;
  encodeFunctionData(functionFragment: "getCash", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "_setComptroller",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "totalBorrows",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "comptroller",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "_reduceReserves",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "initialExchangeRateMantissa",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "accrualBlockNumber",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "underlying",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "balanceOf",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "totalBorrowsCurrent",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "redeemUnderlying",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "totalReserves",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "symbol", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "borrowBalanceStored",
    values: [AddressLike]
  ): string;
  encodeFunctionData(functionFragment: "mint", values: [BigNumberish]): string;
  encodeFunctionData(
    functionFragment: "accrueInterest",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "transfer",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "borrowIndex",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "supplyRatePerBlock",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "seize",
    values: [AddressLike, AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "_setPendingAdmin",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "exchangeRateCurrent",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getAccountSnapshot",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "borrow",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "redeem",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "allowance",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "_acceptAdmin",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "_setInterestRateModel",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "interestRateModel",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "liquidateBorrow",
    values: [AddressLike, BigNumberish, AddressLike]
  ): string;
  encodeFunctionData(functionFragment: "admin", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "borrowRatePerBlock",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "_setReserveFactor",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "isCToken", values?: undefined): string;

  decodeFunctionResult(functionFragment: "name", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "approve", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "repayBorrow",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "reserveFactorMantissa",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "borrowBalanceCurrent",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "totalSupply",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "exchangeRateStored",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "transferFrom",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "repayBorrowBehalf",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "pendingAdmin",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "decimals", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "balanceOfUnderlying",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "getCash", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "_setComptroller",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "totalBorrows",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "comptroller",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_reduceReserves",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "initialExchangeRateMantissa",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "accrualBlockNumber",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "underlying", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "balanceOf", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "totalBorrowsCurrent",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "redeemUnderlying",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "totalReserves",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "symbol", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "borrowBalanceStored",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "mint", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "accrueInterest",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "transfer", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "borrowIndex",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "supplyRatePerBlock",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "seize", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "_setPendingAdmin",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "exchangeRateCurrent",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getAccountSnapshot",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "borrow", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "redeem", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "allowance", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "_acceptAdmin",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_setInterestRateModel",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "interestRateModel",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "liquidateBorrow",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "admin", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "borrowRatePerBlock",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_setReserveFactor",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "isCToken", data: BytesLike): Result;
}

export namespace AccrueInterestEvent {
  export type InputTuple = [
    interestAccumulated: BigNumberish,
    borrowIndex: BigNumberish,
    totalBorrows: BigNumberish
  ];
  export type OutputTuple = [
    interestAccumulated: bigint,
    borrowIndex: bigint,
    totalBorrows: bigint
  ];
  export interface OutputObject {
    interestAccumulated: bigint;
    borrowIndex: bigint;
    totalBorrows: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace MintEvent {
  export type InputTuple = [
    minter: AddressLike,
    mintAmount: BigNumberish,
    mintTokens: BigNumberish
  ];
  export type OutputTuple = [
    minter: string,
    mintAmount: bigint,
    mintTokens: bigint
  ];
  export interface OutputObject {
    minter: string;
    mintAmount: bigint;
    mintTokens: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace RedeemEvent {
  export type InputTuple = [
    redeemer: AddressLike,
    redeemAmount: BigNumberish,
    redeemTokens: BigNumberish
  ];
  export type OutputTuple = [
    redeemer: string,
    redeemAmount: bigint,
    redeemTokens: bigint
  ];
  export interface OutputObject {
    redeemer: string;
    redeemAmount: bigint;
    redeemTokens: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace BorrowEvent {
  export type InputTuple = [
    borrower: AddressLike,
    borrowAmount: BigNumberish,
    accountBorrows: BigNumberish,
    totalBorrows: BigNumberish
  ];
  export type OutputTuple = [
    borrower: string,
    borrowAmount: bigint,
    accountBorrows: bigint,
    totalBorrows: bigint
  ];
  export interface OutputObject {
    borrower: string;
    borrowAmount: bigint;
    accountBorrows: bigint;
    totalBorrows: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace RepayBorrowEvent {
  export type InputTuple = [
    payer: AddressLike,
    borrower: AddressLike,
    repayAmount: BigNumberish,
    accountBorrows: BigNumberish,
    totalBorrows: BigNumberish
  ];
  export type OutputTuple = [
    payer: string,
    borrower: string,
    repayAmount: bigint,
    accountBorrows: bigint,
    totalBorrows: bigint
  ];
  export interface OutputObject {
    payer: string;
    borrower: string;
    repayAmount: bigint;
    accountBorrows: bigint;
    totalBorrows: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace LiquidateBorrowEvent {
  export type InputTuple = [
    liquidator: AddressLike,
    borrower: AddressLike,
    repayAmount: BigNumberish,
    cTokenCollateral: AddressLike,
    seizeTokens: BigNumberish
  ];
  export type OutputTuple = [
    liquidator: string,
    borrower: string,
    repayAmount: bigint,
    cTokenCollateral: string,
    seizeTokens: bigint
  ];
  export interface OutputObject {
    liquidator: string;
    borrower: string;
    repayAmount: bigint;
    cTokenCollateral: string;
    seizeTokens: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace NewPendingAdminEvent {
  export type InputTuple = [
    oldPendingAdmin: AddressLike,
    newPendingAdmin: AddressLike
  ];
  export type OutputTuple = [oldPendingAdmin: string, newPendingAdmin: string];
  export interface OutputObject {
    oldPendingAdmin: string;
    newPendingAdmin: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace NewAdminEvent {
  export type InputTuple = [oldAdmin: AddressLike, newAdmin: AddressLike];
  export type OutputTuple = [oldAdmin: string, newAdmin: string];
  export interface OutputObject {
    oldAdmin: string;
    newAdmin: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace NewComptrollerEvent {
  export type InputTuple = [
    oldComptroller: AddressLike,
    newComptroller: AddressLike
  ];
  export type OutputTuple = [oldComptroller: string, newComptroller: string];
  export interface OutputObject {
    oldComptroller: string;
    newComptroller: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace NewMarketInterestRateModelEvent {
  export type InputTuple = [
    oldInterestRateModel: AddressLike,
    newInterestRateModel: AddressLike
  ];
  export type OutputTuple = [
    oldInterestRateModel: string,
    newInterestRateModel: string
  ];
  export interface OutputObject {
    oldInterestRateModel: string;
    newInterestRateModel: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace NewReserveFactorEvent {
  export type InputTuple = [
    oldReserveFactorMantissa: BigNumberish,
    newReserveFactorMantissa: BigNumberish
  ];
  export type OutputTuple = [
    oldReserveFactorMantissa: bigint,
    newReserveFactorMantissa: bigint
  ];
  export interface OutputObject {
    oldReserveFactorMantissa: bigint;
    newReserveFactorMantissa: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace ReservesReducedEvent {
  export type InputTuple = [
    admin: AddressLike,
    reduceAmount: BigNumberish,
    newTotalReserves: BigNumberish
  ];
  export type OutputTuple = [
    admin: string,
    reduceAmount: bigint,
    newTotalReserves: bigint
  ];
  export interface OutputObject {
    admin: string;
    reduceAmount: bigint;
    newTotalReserves: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace FailureEvent {
  export type InputTuple = [
    error: BigNumberish,
    info: BigNumberish,
    detail: BigNumberish
  ];
  export type OutputTuple = [error: bigint, info: bigint, detail: bigint];
  export interface OutputObject {
    error: bigint;
    info: bigint;
    detail: bigint;
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
    amount: BigNumberish
  ];
  export type OutputTuple = [from: string, to: string, amount: bigint];
  export interface OutputObject {
    from: string;
    to: string;
    amount: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace ApprovalEvent {
  export type InputTuple = [
    owner: AddressLike,
    spender: AddressLike,
    amount: BigNumberish
  ];
  export type OutputTuple = [owner: string, spender: string, amount: bigint];
  export interface OutputObject {
    owner: string;
    spender: string;
    amount: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface CompoundV2Cerc20 extends BaseContract {
  connect(runner?: ContractRunner | null): CompoundV2Cerc20;
  waitForDeployment(): Promise<this>;

  interface: CompoundV2Cerc20Interface;

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

  name: TypedContractMethod<[], [string], "view">;

  approve: TypedContractMethod<
    [spender: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;

  repayBorrow: TypedContractMethod<
    [repayAmount: BigNumberish],
    [bigint],
    "nonpayable"
  >;

  reserveFactorMantissa: TypedContractMethod<[], [bigint], "view">;

  borrowBalanceCurrent: TypedContractMethod<
    [account: AddressLike],
    [bigint],
    "nonpayable"
  >;

  totalSupply: TypedContractMethod<[], [bigint], "view">;

  exchangeRateStored: TypedContractMethod<[], [bigint], "view">;

  transferFrom: TypedContractMethod<
    [src: AddressLike, dst: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;

  repayBorrowBehalf: TypedContractMethod<
    [borrower: AddressLike, repayAmount: BigNumberish],
    [bigint],
    "nonpayable"
  >;

  pendingAdmin: TypedContractMethod<[], [string], "view">;

  decimals: TypedContractMethod<[], [bigint], "view">;

  balanceOfUnderlying: TypedContractMethod<
    [owner: AddressLike],
    [bigint],
    "nonpayable"
  >;

  getCash: TypedContractMethod<[], [bigint], "view">;

  _setComptroller: TypedContractMethod<
    [newComptroller: AddressLike],
    [bigint],
    "nonpayable"
  >;

  totalBorrows: TypedContractMethod<[], [bigint], "view">;

  comptroller: TypedContractMethod<[], [string], "view">;

  _reduceReserves: TypedContractMethod<
    [reduceAmount: BigNumberish],
    [bigint],
    "nonpayable"
  >;

  initialExchangeRateMantissa: TypedContractMethod<[], [bigint], "view">;

  accrualBlockNumber: TypedContractMethod<[], [bigint], "view">;

  underlying: TypedContractMethod<[], [string], "view">;

  balanceOf: TypedContractMethod<[owner: AddressLike], [bigint], "view">;

  totalBorrowsCurrent: TypedContractMethod<[], [bigint], "nonpayable">;

  redeemUnderlying: TypedContractMethod<
    [redeemAmount: BigNumberish],
    [bigint],
    "nonpayable"
  >;

  totalReserves: TypedContractMethod<[], [bigint], "view">;

  symbol: TypedContractMethod<[], [string], "view">;

  borrowBalanceStored: TypedContractMethod<
    [account: AddressLike],
    [bigint],
    "view"
  >;

  mint: TypedContractMethod<[mintAmount: BigNumberish], [bigint], "nonpayable">;

  accrueInterest: TypedContractMethod<[], [bigint], "nonpayable">;

  transfer: TypedContractMethod<
    [dst: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;

  borrowIndex: TypedContractMethod<[], [bigint], "view">;

  supplyRatePerBlock: TypedContractMethod<[], [bigint], "view">;

  seize: TypedContractMethod<
    [liquidator: AddressLike, borrower: AddressLike, seizeTokens: BigNumberish],
    [bigint],
    "nonpayable"
  >;

  _setPendingAdmin: TypedContractMethod<
    [newPendingAdmin: AddressLike],
    [bigint],
    "nonpayable"
  >;

  exchangeRateCurrent: TypedContractMethod<[], [bigint], "nonpayable">;

  getAccountSnapshot: TypedContractMethod<
    [account: AddressLike],
    [[bigint, bigint, bigint, bigint]],
    "view"
  >;

  borrow: TypedContractMethod<
    [borrowAmount: BigNumberish],
    [bigint],
    "nonpayable"
  >;

  redeem: TypedContractMethod<
    [redeemTokens: BigNumberish],
    [bigint],
    "nonpayable"
  >;

  allowance: TypedContractMethod<
    [owner: AddressLike, spender: AddressLike],
    [bigint],
    "view"
  >;

  _acceptAdmin: TypedContractMethod<[], [bigint], "nonpayable">;

  _setInterestRateModel: TypedContractMethod<
    [newInterestRateModel: AddressLike],
    [bigint],
    "nonpayable"
  >;

  interestRateModel: TypedContractMethod<[], [string], "view">;

  liquidateBorrow: TypedContractMethod<
    [
      borrower: AddressLike,
      repayAmount: BigNumberish,
      cTokenCollateral: AddressLike
    ],
    [bigint],
    "nonpayable"
  >;

  admin: TypedContractMethod<[], [string], "view">;

  borrowRatePerBlock: TypedContractMethod<[], [bigint], "view">;

  _setReserveFactor: TypedContractMethod<
    [newReserveFactorMantissa: BigNumberish],
    [bigint],
    "nonpayable"
  >;

  isCToken: TypedContractMethod<[], [boolean], "view">;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "name"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "approve"
  ): TypedContractMethod<
    [spender: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "repayBorrow"
  ): TypedContractMethod<[repayAmount: BigNumberish], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "reserveFactorMantissa"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "borrowBalanceCurrent"
  ): TypedContractMethod<[account: AddressLike], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "totalSupply"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "exchangeRateStored"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "transferFrom"
  ): TypedContractMethod<
    [src: AddressLike, dst: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "repayBorrowBehalf"
  ): TypedContractMethod<
    [borrower: AddressLike, repayAmount: BigNumberish],
    [bigint],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "pendingAdmin"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "decimals"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "balanceOfUnderlying"
  ): TypedContractMethod<[owner: AddressLike], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "getCash"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "_setComptroller"
  ): TypedContractMethod<[newComptroller: AddressLike], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "totalBorrows"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "comptroller"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "_reduceReserves"
  ): TypedContractMethod<[reduceAmount: BigNumberish], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "initialExchangeRateMantissa"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "accrualBlockNumber"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "underlying"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "balanceOf"
  ): TypedContractMethod<[owner: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "totalBorrowsCurrent"
  ): TypedContractMethod<[], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "redeemUnderlying"
  ): TypedContractMethod<[redeemAmount: BigNumberish], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "totalReserves"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "symbol"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "borrowBalanceStored"
  ): TypedContractMethod<[account: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "mint"
  ): TypedContractMethod<[mintAmount: BigNumberish], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "accrueInterest"
  ): TypedContractMethod<[], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "transfer"
  ): TypedContractMethod<
    [dst: AddressLike, amount: BigNumberish],
    [boolean],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "borrowIndex"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "supplyRatePerBlock"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "seize"
  ): TypedContractMethod<
    [liquidator: AddressLike, borrower: AddressLike, seizeTokens: BigNumberish],
    [bigint],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "_setPendingAdmin"
  ): TypedContractMethod<
    [newPendingAdmin: AddressLike],
    [bigint],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "exchangeRateCurrent"
  ): TypedContractMethod<[], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "getAccountSnapshot"
  ): TypedContractMethod<
    [account: AddressLike],
    [[bigint, bigint, bigint, bigint]],
    "view"
  >;
  getFunction(
    nameOrSignature: "borrow"
  ): TypedContractMethod<[borrowAmount: BigNumberish], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "redeem"
  ): TypedContractMethod<[redeemTokens: BigNumberish], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "allowance"
  ): TypedContractMethod<
    [owner: AddressLike, spender: AddressLike],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "_acceptAdmin"
  ): TypedContractMethod<[], [bigint], "nonpayable">;
  getFunction(
    nameOrSignature: "_setInterestRateModel"
  ): TypedContractMethod<
    [newInterestRateModel: AddressLike],
    [bigint],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "interestRateModel"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "liquidateBorrow"
  ): TypedContractMethod<
    [
      borrower: AddressLike,
      repayAmount: BigNumberish,
      cTokenCollateral: AddressLike
    ],
    [bigint],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "admin"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "borrowRatePerBlock"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "_setReserveFactor"
  ): TypedContractMethod<
    [newReserveFactorMantissa: BigNumberish],
    [bigint],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "isCToken"
  ): TypedContractMethod<[], [boolean], "view">;

  getEvent(
    key: "AccrueInterest"
  ): TypedContractEvent<
    AccrueInterestEvent.InputTuple,
    AccrueInterestEvent.OutputTuple,
    AccrueInterestEvent.OutputObject
  >;
  getEvent(
    key: "Mint"
  ): TypedContractEvent<
    MintEvent.InputTuple,
    MintEvent.OutputTuple,
    MintEvent.OutputObject
  >;
  getEvent(
    key: "Redeem"
  ): TypedContractEvent<
    RedeemEvent.InputTuple,
    RedeemEvent.OutputTuple,
    RedeemEvent.OutputObject
  >;
  getEvent(
    key: "Borrow"
  ): TypedContractEvent<
    BorrowEvent.InputTuple,
    BorrowEvent.OutputTuple,
    BorrowEvent.OutputObject
  >;
  getEvent(
    key: "RepayBorrow"
  ): TypedContractEvent<
    RepayBorrowEvent.InputTuple,
    RepayBorrowEvent.OutputTuple,
    RepayBorrowEvent.OutputObject
  >;
  getEvent(
    key: "LiquidateBorrow"
  ): TypedContractEvent<
    LiquidateBorrowEvent.InputTuple,
    LiquidateBorrowEvent.OutputTuple,
    LiquidateBorrowEvent.OutputObject
  >;
  getEvent(
    key: "NewPendingAdmin"
  ): TypedContractEvent<
    NewPendingAdminEvent.InputTuple,
    NewPendingAdminEvent.OutputTuple,
    NewPendingAdminEvent.OutputObject
  >;
  getEvent(
    key: "NewAdmin"
  ): TypedContractEvent<
    NewAdminEvent.InputTuple,
    NewAdminEvent.OutputTuple,
    NewAdminEvent.OutputObject
  >;
  getEvent(
    key: "NewComptroller"
  ): TypedContractEvent<
    NewComptrollerEvent.InputTuple,
    NewComptrollerEvent.OutputTuple,
    NewComptrollerEvent.OutputObject
  >;
  getEvent(
    key: "NewMarketInterestRateModel"
  ): TypedContractEvent<
    NewMarketInterestRateModelEvent.InputTuple,
    NewMarketInterestRateModelEvent.OutputTuple,
    NewMarketInterestRateModelEvent.OutputObject
  >;
  getEvent(
    key: "NewReserveFactor"
  ): TypedContractEvent<
    NewReserveFactorEvent.InputTuple,
    NewReserveFactorEvent.OutputTuple,
    NewReserveFactorEvent.OutputObject
  >;
  getEvent(
    key: "ReservesReduced"
  ): TypedContractEvent<
    ReservesReducedEvent.InputTuple,
    ReservesReducedEvent.OutputTuple,
    ReservesReducedEvent.OutputObject
  >;
  getEvent(
    key: "Failure"
  ): TypedContractEvent<
    FailureEvent.InputTuple,
    FailureEvent.OutputTuple,
    FailureEvent.OutputObject
  >;
  getEvent(
    key: "Transfer"
  ): TypedContractEvent<
    TransferEvent.InputTuple,
    TransferEvent.OutputTuple,
    TransferEvent.OutputObject
  >;
  getEvent(
    key: "Approval"
  ): TypedContractEvent<
    ApprovalEvent.InputTuple,
    ApprovalEvent.OutputTuple,
    ApprovalEvent.OutputObject
  >;

  filters: {
    "AccrueInterest(uint256,uint256,uint256)": TypedContractEvent<
      AccrueInterestEvent.InputTuple,
      AccrueInterestEvent.OutputTuple,
      AccrueInterestEvent.OutputObject
    >;
    AccrueInterest: TypedContractEvent<
      AccrueInterestEvent.InputTuple,
      AccrueInterestEvent.OutputTuple,
      AccrueInterestEvent.OutputObject
    >;

    "Mint(address,uint256,uint256)": TypedContractEvent<
      MintEvent.InputTuple,
      MintEvent.OutputTuple,
      MintEvent.OutputObject
    >;
    Mint: TypedContractEvent<
      MintEvent.InputTuple,
      MintEvent.OutputTuple,
      MintEvent.OutputObject
    >;

    "Redeem(address,uint256,uint256)": TypedContractEvent<
      RedeemEvent.InputTuple,
      RedeemEvent.OutputTuple,
      RedeemEvent.OutputObject
    >;
    Redeem: TypedContractEvent<
      RedeemEvent.InputTuple,
      RedeemEvent.OutputTuple,
      RedeemEvent.OutputObject
    >;

    "Borrow(address,uint256,uint256,uint256)": TypedContractEvent<
      BorrowEvent.InputTuple,
      BorrowEvent.OutputTuple,
      BorrowEvent.OutputObject
    >;
    Borrow: TypedContractEvent<
      BorrowEvent.InputTuple,
      BorrowEvent.OutputTuple,
      BorrowEvent.OutputObject
    >;

    "RepayBorrow(address,address,uint256,uint256,uint256)": TypedContractEvent<
      RepayBorrowEvent.InputTuple,
      RepayBorrowEvent.OutputTuple,
      RepayBorrowEvent.OutputObject
    >;
    RepayBorrow: TypedContractEvent<
      RepayBorrowEvent.InputTuple,
      RepayBorrowEvent.OutputTuple,
      RepayBorrowEvent.OutputObject
    >;

    "LiquidateBorrow(address,address,uint256,address,uint256)": TypedContractEvent<
      LiquidateBorrowEvent.InputTuple,
      LiquidateBorrowEvent.OutputTuple,
      LiquidateBorrowEvent.OutputObject
    >;
    LiquidateBorrow: TypedContractEvent<
      LiquidateBorrowEvent.InputTuple,
      LiquidateBorrowEvent.OutputTuple,
      LiquidateBorrowEvent.OutputObject
    >;

    "NewPendingAdmin(address,address)": TypedContractEvent<
      NewPendingAdminEvent.InputTuple,
      NewPendingAdminEvent.OutputTuple,
      NewPendingAdminEvent.OutputObject
    >;
    NewPendingAdmin: TypedContractEvent<
      NewPendingAdminEvent.InputTuple,
      NewPendingAdminEvent.OutputTuple,
      NewPendingAdminEvent.OutputObject
    >;

    "NewAdmin(address,address)": TypedContractEvent<
      NewAdminEvent.InputTuple,
      NewAdminEvent.OutputTuple,
      NewAdminEvent.OutputObject
    >;
    NewAdmin: TypedContractEvent<
      NewAdminEvent.InputTuple,
      NewAdminEvent.OutputTuple,
      NewAdminEvent.OutputObject
    >;

    "NewComptroller(address,address)": TypedContractEvent<
      NewComptrollerEvent.InputTuple,
      NewComptrollerEvent.OutputTuple,
      NewComptrollerEvent.OutputObject
    >;
    NewComptroller: TypedContractEvent<
      NewComptrollerEvent.InputTuple,
      NewComptrollerEvent.OutputTuple,
      NewComptrollerEvent.OutputObject
    >;

    "NewMarketInterestRateModel(address,address)": TypedContractEvent<
      NewMarketInterestRateModelEvent.InputTuple,
      NewMarketInterestRateModelEvent.OutputTuple,
      NewMarketInterestRateModelEvent.OutputObject
    >;
    NewMarketInterestRateModel: TypedContractEvent<
      NewMarketInterestRateModelEvent.InputTuple,
      NewMarketInterestRateModelEvent.OutputTuple,
      NewMarketInterestRateModelEvent.OutputObject
    >;

    "NewReserveFactor(uint256,uint256)": TypedContractEvent<
      NewReserveFactorEvent.InputTuple,
      NewReserveFactorEvent.OutputTuple,
      NewReserveFactorEvent.OutputObject
    >;
    NewReserveFactor: TypedContractEvent<
      NewReserveFactorEvent.InputTuple,
      NewReserveFactorEvent.OutputTuple,
      NewReserveFactorEvent.OutputObject
    >;

    "ReservesReduced(address,uint256,uint256)": TypedContractEvent<
      ReservesReducedEvent.InputTuple,
      ReservesReducedEvent.OutputTuple,
      ReservesReducedEvent.OutputObject
    >;
    ReservesReduced: TypedContractEvent<
      ReservesReducedEvent.InputTuple,
      ReservesReducedEvent.OutputTuple,
      ReservesReducedEvent.OutputObject
    >;

    "Failure(uint256,uint256,uint256)": TypedContractEvent<
      FailureEvent.InputTuple,
      FailureEvent.OutputTuple,
      FailureEvent.OutputObject
    >;
    Failure: TypedContractEvent<
      FailureEvent.InputTuple,
      FailureEvent.OutputTuple,
      FailureEvent.OutputObject
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
  };
}