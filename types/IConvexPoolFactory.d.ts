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

interface IConvexPoolFactoryInterface extends ethers.utils.Interface {
  functions: {
    "deployBasePool(uint256,address,address,address,address)": FunctionFragment;
    "deployExtraPool(address,address,address,address)": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "deployBasePool",
    values: [BigNumberish, string, string, string, string]
  ): string;
  encodeFunctionData(
    functionFragment: "deployExtraPool",
    values: [string, string, string, string]
  ): string;

  decodeFunctionResult(
    functionFragment: "deployBasePool",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployExtraPool",
    data: BytesLike
  ): Result;

  events: {};
}

export class IConvexPoolFactory extends BaseContract {
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

  interface: IConvexPoolFactoryInterface;

  functions: {
    deployBasePool(
      _pid: BigNumberish,
      _stakingToken: string,
      _rewardToken: string,
      _operator: string,
      _manager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    deployExtraPool(
      _basePool: string,
      _rewardToken: string,
      _operator: string,
      _manager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;
  };

  deployBasePool(
    _pid: BigNumberish,
    _stakingToken: string,
    _rewardToken: string,
    _operator: string,
    _manager: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  deployExtraPool(
    _basePool: string,
    _rewardToken: string,
    _operator: string,
    _manager: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    deployBasePool(
      _pid: BigNumberish,
      _stakingToken: string,
      _rewardToken: string,
      _operator: string,
      _manager: string,
      overrides?: CallOverrides
    ): Promise<string>;

    deployExtraPool(
      _basePool: string,
      _rewardToken: string,
      _operator: string,
      _manager: string,
      overrides?: CallOverrides
    ): Promise<string>;
  };

  filters: {};

  estimateGas: {
    deployBasePool(
      _pid: BigNumberish,
      _stakingToken: string,
      _rewardToken: string,
      _operator: string,
      _manager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    deployExtraPool(
      _basePool: string,
      _rewardToken: string,
      _operator: string,
      _manager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    deployBasePool(
      _pid: BigNumberish,
      _stakingToken: string,
      _rewardToken: string,
      _operator: string,
      _manager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    deployExtraPool(
      _basePool: string,
      _rewardToken: string,
      _operator: string,
      _manager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;
  };
}
