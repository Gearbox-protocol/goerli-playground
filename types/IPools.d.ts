/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  ethers,
  EventFilter,
  Signer,
  BigNumber,
  BigNumberish,
  PopulatedTransaction,
  BaseContract,
  ContractTransaction,
  Overrides,
  CallOverrides,
} from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";
import type { TypedEventFilter, TypedEvent, TypedListener } from "./common";

interface IPoolsInterface extends ethers.utils.Interface {
  functions: {
    "addPool(address,address,uint256)": FunctionFragment;
    "forceAddPool(address,address,uint256)": FunctionFragment;
    "gaugeMap(address)": FunctionFragment;
    "poolInfo(uint256)": FunctionFragment;
    "poolLength()": FunctionFragment;
    "setPoolManager(address)": FunctionFragment;
    "shutdownPool(uint256)": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "addPool",
    values: [string, string, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "forceAddPool",
    values: [string, string, BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "gaugeMap", values: [string]): string;
  encodeFunctionData(
    functionFragment: "poolInfo",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "poolLength",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "setPoolManager",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "shutdownPool",
    values: [BigNumberish]
  ): string;

  decodeFunctionResult(functionFragment: "addPool", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "forceAddPool",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "gaugeMap", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "poolInfo", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "poolLength", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "setPoolManager",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "shutdownPool",
    data: BytesLike
  ): Result;

  events: {};
}

export class IPools extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  listeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter?: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): Array<TypedListener<EventArgsArray, EventArgsObject>>;
  off<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  on<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  once<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeListener<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeAllListeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): this;

  listeners(eventName?: string): Array<Listener>;
  off(eventName: string, listener: Listener): this;
  on(eventName: string, listener: Listener): this;
  once(eventName: string, listener: Listener): this;
  removeListener(eventName: string, listener: Listener): this;
  removeAllListeners(eventName?: string): this;

  queryFilter<EventArgsArray extends Array<any>, EventArgsObject>(
    event: TypedEventFilter<EventArgsArray, EventArgsObject>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEvent<EventArgsArray & EventArgsObject>>>;

  interface: IPoolsInterface;

  functions: {
    addPool(
      _lptoken: string,
      _gauge: string,
      _stashVersion: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    forceAddPool(
      _lptoken: string,
      _gauge: string,
      _stashVersion: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    gaugeMap(arg0: string, overrides?: CallOverrides): Promise<[boolean]>;

    poolInfo(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[string, string, string, string, string, boolean]>;

    poolLength(overrides?: CallOverrides): Promise<[BigNumber]>;

    setPoolManager(
      _poolM: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    shutdownPool(
      _pid: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;
  };

  addPool(
    _lptoken: string,
    _gauge: string,
    _stashVersion: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  forceAddPool(
    _lptoken: string,
    _gauge: string,
    _stashVersion: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  gaugeMap(arg0: string, overrides?: CallOverrides): Promise<boolean>;

  poolInfo(
    arg0: BigNumberish,
    overrides?: CallOverrides
  ): Promise<[string, string, string, string, string, boolean]>;

  poolLength(overrides?: CallOverrides): Promise<BigNumber>;

  setPoolManager(
    _poolM: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  shutdownPool(
    _pid: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    addPool(
      _lptoken: string,
      _gauge: string,
      _stashVersion: BigNumberish,
      overrides?: CallOverrides
    ): Promise<boolean>;

    forceAddPool(
      _lptoken: string,
      _gauge: string,
      _stashVersion: BigNumberish,
      overrides?: CallOverrides
    ): Promise<boolean>;

    gaugeMap(arg0: string, overrides?: CallOverrides): Promise<boolean>;

    poolInfo(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[string, string, string, string, string, boolean]>;

    poolLength(overrides?: CallOverrides): Promise<BigNumber>;

    setPoolManager(_poolM: string, overrides?: CallOverrides): Promise<void>;

    shutdownPool(
      _pid: BigNumberish,
      overrides?: CallOverrides
    ): Promise<boolean>;
  };

  filters: {};

  estimateGas: {
    addPool(
      _lptoken: string,
      _gauge: string,
      _stashVersion: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    forceAddPool(
      _lptoken: string,
      _gauge: string,
      _stashVersion: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    gaugeMap(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

    poolInfo(arg0: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;

    poolLength(overrides?: CallOverrides): Promise<BigNumber>;

    setPoolManager(
      _poolM: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    shutdownPool(
      _pid: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    addPool(
      _lptoken: string,
      _gauge: string,
      _stashVersion: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    forceAddPool(
      _lptoken: string,
      _gauge: string,
      _stashVersion: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    gaugeMap(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    poolInfo(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    poolLength(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    setPoolManager(
      _poolM: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    shutdownPool(
      _pid: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;
  };
}
