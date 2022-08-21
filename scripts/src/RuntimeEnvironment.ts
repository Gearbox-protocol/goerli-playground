import { Verifier } from "@gearbox-protocol/devops";
import {
  GOERLI_NETWORK,
  HARDHAT_NETWORK,
  KOVAN_NETWORK,
  LOCAL_NETWORK,
  MAINNET_NETWORK,
  NetworkType,
} from "@gearbox-protocol/sdk";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { providers } from "ethers";
import hre, { ethers } from "hardhat";
import { Logger } from "tslog";

import { ProgressTracker } from "./ProgressTracker";

/**
 * Singleton runtime environment, shared when multiple scripts run together
 */
export default class RuntimeEnvironment {
  private static _instance?: RuntimeEnvironment;

  public static async setup(): Promise<RuntimeEnvironment> {
    if (RuntimeEnvironment._instance) {
      return RuntimeEnvironment._instance;
    }

    const instance = new RuntimeEnvironment();
    const mainnetRpc = process.env.ETH_MAINNET_PROVIDER;
    if (!mainnetRpc) {
      throw new Error("ETH_MAINNET_PROVIDER is not defined");
    }

    const accounts = await ethers.getSigners();
    instance.deployer = accounts[0];
    const chainId = await instance.deployer.getChainId();
    if (chainId === MAINNET_NETWORK) {
      throw new Error("Switch to test network");
    }
    // You can't run these scripts on LOCAL_NETWORK (ChainID 1337) because they requires some third-party contracts to exist (WETH, Uniswap)
    if (
      chainId === LOCAL_NETWORK ||
      !hre.config.networks.hardhat.forking?.url
    ) {
      throw new Error("Please use hardhat fork for local development");
    }
    let originChainId = chainId;
    let progressFileSuffix = "";
    // If we're working with local hardhat fork, determine which network it's forked from
    if (chainId === HARDHAT_NETWORK) {
      progressFileSuffix = ".local";
      const originProvider = new providers.JsonRpcProvider(
        hre.config.networks.hardhat.forking.url,
      );
      const originNetwork = await originProvider.getNetwork();
      originChainId = originNetwork.chainId;
    }
    switch (originChainId) {
      case KOVAN_NETWORK:
        instance.network = "Kovan";
        break;
      case GOERLI_NETWORK:
        instance.network = "Goerli";
        break;
      default:
        throw new Error(`unsupported chain id: ${originChainId}`);
    }
    if (!("url" in hre.network.config)) {
      throw new Error("url not found in network config");
    }
    instance.mainnetProvider = new providers.JsonRpcProvider(mainnetRpc);
    instance.testnetProvider = new providers.JsonRpcProvider(
      hre.network.config.url,
    );
    instance.progress = new ProgressTracker(
      `.progress.${instance.network.toLowerCase()}${progressFileSuffix}.json`,
    );

    instance.log.info(`Script setup complete. 
    ChainID = ${chainId} 
    OriginChainId = ${originChainId}
    Deployer = ${instance.deployer.address}
    `);

    RuntimeEnvironment._instance = instance;
    return instance;
  }

  public log: Logger = new Logger();
  public verifier: Verifier = new Verifier();
  public deployer!: SignerWithAddress;
  public mainnetProvider!: providers.JsonRpcProvider;
  public testnetProvider!: providers.JsonRpcProvider;
  public progress!: ProgressTracker;
  public network!: NetworkType;

  public from(other: RuntimeEnvironment): void {
    this.log = other.log;
    this.verifier = other.verifier;
    this.deployer = other.deployer;
    this.mainnetProvider = other.mainnetProvider;
    this.testnetProvider = other.testnetProvider;
    this.progress = other.progress;
    this.network = other.network;
  }
}
