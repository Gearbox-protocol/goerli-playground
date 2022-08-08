// @ts-ignore
import { ethers, SignerOrProvider } from "hardhat";
// @ts-ignore
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/root-with-address";
import { Verifier } from "@gearbox-protocol/devops";
import {
  MAINNET_NETWORK,
  SupportedContract,
  SupportedToken,
  supportedTokens,
  YearnLPToken,
} from "@gearbox-protocol/sdk";
import { PartialRecord } from "@gearbox-protocol/sdk/lib/utils/types";

import * as dotenv from "dotenv";
import { providers } from "ethers";
import fs from "fs";
import { Logger } from "tslog";
import { ConvexDeployer } from "./convexDeployer";
import { CurveDeployer } from "./curveDeployer";
import { LidoDeployer } from "./lidoDeploy";
import { YearnDeployer } from "./yearnDeployer";

dotenv.config({ path: ".env.local" });

const PROGRESS_FILE_NAME = "./mockAddresses.json";

export type SupportedEntity =
  | SupportedToken
  | SupportedContract
  | "CURVE_STECRV_POOL"
  | "KOVAN_CONVEX_MANAGER"
  | "LIDO_ORACLE";

export interface ProgressGetter {
  saveProgress(entity: SupportedEntity, address: string): void;
  getProgress(entity: SupportedEntity): string | undefined;
}

type AddressList = PartialRecord<SupportedEntity, string>;

const yearnTokenList: Array<YearnLPToken> = [
  "yvDAI",
  "yvUSDC",
  "yvWETH",
  "yvWBTC",
  "yvCurve_stETH",
  "yvCurve_FRAX",
];

class TestnetPlaygroundDeployer implements ProgressGetter {
  log: Logger = new Logger({
    minLevel: "debug",
    displayFunctionName: false,
    displayLoggerName: false,
    displayFilePath: "hidden",
  });
  verifier: Verifier = new Verifier();
  deployer: SignerWithAddress;
  mainnetProvider: SignerOrProvider;
  contractAddresses: AddressList = {};

  async deployMocks() {
    const accounts = (await ethers.getSigners()) as Array<SignerWithAddress>;
    this.deployer = accounts[0];
    const chainId = await this.deployer.getChainId();
    if (chainId === MAINNET_NETWORK) {
      throw new Error("Switch to Kovan network");
    }

    const mainnetRpc = process.env.ETH_MAINNET_PROVIDER;
    if (!mainnetRpc) {
      throw new Error("ETH_MAINNET_PROVIDER is not defined");
    }

    if (fs.existsSync(PROGRESS_FILE_NAME)) {
      this.log.warn("FOUND FILE WITH PREVIOUS PROGRESS!");
      const savedProgress = fs.readFileSync(PROGRESS_FILE_NAME, {
        encoding: "utf-8",
      });

      this.contractAddresses = JSON.parse(savedProgress);
    }

    this.mainnetProvider = new providers.JsonRpcProvider(
      mainnetRpc
    ) as SignerOrProvider;

    this.log.info(`Deployer: ${this.deployer.address}`);

    const lidoDeployer = new LidoDeployer(
      this.log,
      this.verifier,
      this.deployer,
      this.mainnetProvider,
      this
    );

    await lidoDeployer.deploy();

    const curveDeployer = new CurveDeployer(
      this.log,
      this.verifier,
      this.deployer,
      this.mainnetProvider,
      this
    );

    await curveDeployer.deploy();

    const convexDeployer = new ConvexDeployer(
      this.log,
      this.verifier,
      this.deployer,
      this.mainnetProvider,
      this
    );
    await convexDeployer.deploy();

    const yearnDeployer = new YearnDeployer(
      this.log,
      this.verifier,
      this.deployer,
      this.mainnetProvider,
      this
    );

    await yearnDeployer.deploy();

    this.printProgress();
  }

  saveProgress(entity: SupportedEntity, address: string) {
    this.contractAddresses[entity] = address;
    fs.writeFileSync(
      PROGRESS_FILE_NAME,
      JSON.stringify(this.contractAddresses)
    );
  }

  getProgress(entity: SupportedEntity): string | undefined {
    return this.contractAddresses[entity];
  }

  printProgress() {
    const tokens = Object.keys(supportedTokens);

    const tokensToPrint = Object.entries(this.contractAddresses)
      .filter(([entity]) => tokens.includes(entity))
      .reduce((state, [entity, addr]) => ({ ...state, [entity]: addr }), {});

    this.log.info("TOKENS: \n", tokensToPrint);

    const contractsToPrint = Object.entries(this.contractAddresses)
      .filter(([entity]) => !tokens.includes(entity))
      .reduce((state, [entity, addr]) => ({ ...state, [entity]: addr }), {});

    this.log.info("CONTRACTS: \n", contractsToPrint);
  }
}

const kovanPlaygroundDeployer = new TestnetPlaygroundDeployer();
kovanPlaygroundDeployer
  .deployMocks()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
