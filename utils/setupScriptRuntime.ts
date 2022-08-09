import { ethers } from "hardhat";
import { providers } from "ethers";
import { MAINNET_NETWORK } from "@gearbox-protocol/sdk";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import config from "../config";

export interface ScriptRuntime {
  chainId: number;
  deployer: SignerWithAddress;
  mainnetProvider: providers.JsonRpcProvider;
  testnetProvider: providers.JsonRpcProvider;
}

export default async function setupScriptRuntime(): Promise<ScriptRuntime> {
  const mainnetRpc = process.env.ETH_MAINNET_PROVIDER;
  if (!mainnetRpc) {
    throw new Error("ETH_MAINNET_PROVIDER is not defined");
  }

  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  const chainId = await deployer.getChainId();
  if (chainId === MAINNET_NETWORK) {
    throw new Error("Switch to test network");
  }

  const mainnetProvider = new providers.JsonRpcProvider(mainnetRpc);
  const testnetProvider = new providers.JsonRpcProvider(config.url);

  return {
    chainId,
    deployer,
    mainnetProvider,
    testnetProvider,
  };
}
