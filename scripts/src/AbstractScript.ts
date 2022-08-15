import {
  HARDHAT_NETWORK,
  LOCAL_NETWORK,
  MAINNET_NETWORK
} from "@gearbox-protocol/sdk";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { config as dotEnvConfig } from "dotenv";
import { providers } from "ethers";
import { ethers } from "hardhat";
import { Logger } from "tslog";

import config from "../../config";
import { ProgressTracker } from "./ProgressTracker";

export abstract class AbstractScript {
  protected log: Logger = new Logger();
  protected chainId!: number;
  protected deployer!: SignerWithAddress;
  protected mainnetProvider!: providers.JsonRpcProvider;
  protected testnetProvider!: providers.JsonRpcProvider;
  protected progress = new ProgressTracker(config.progressFileName);

  public async exec(): Promise<void> {
    await this.setup();
    await this.run();
  }

  protected async setup(): Promise<void> {
    dotEnvConfig();
    const mainnetRpc = process.env.ETH_MAINNET_PROVIDER;
    if (!mainnetRpc) {
      throw new Error("ETH_MAINNET_PROVIDER is not defined");
    }

    const accounts = await ethers.getSigners();
    this.deployer = accounts[0];
    this.chainId = await this.deployer.getChainId();
    if (this.chainId === MAINNET_NETWORK) {
      throw new Error("Switch to test network");
    }

    this.mainnetProvider = new providers.JsonRpcProvider(mainnetRpc);
    this.testnetProvider = new providers.JsonRpcProvider(config.url);

    this.log.info(
      `Script setup complete. ChainID = ${this.chainId} Deployer = ${this.deployer.address}`
    );
  }

  protected get canVerify(): boolean {
    return this.chainId !== LOCAL_NETWORK && this.chainId !== HARDHAT_NETWORK;
  }

  protected abstract run(): Promise<void>;
}
