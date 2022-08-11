import { Verifier } from "@gearbox-protocol/devops";
import {
  SupportedContract,
  SupportedToken,
  supportedTokens,
} from "@gearbox-protocol/sdk";
import { PartialRecord } from "@gearbox-protocol/sdk/lib/utils/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { providers } from "ethers";
import fs from "fs";
import { Logger } from "tslog";

import config from "../config";
import setupScriptRuntime from "../utils/setupScriptRuntime";
import { ConvexDeployer } from "./convexDeployer";
import { CurveDeployer } from "./curveDeployer";
import { LidoDeployer } from "./lidoDeploy";
import { YearnDeployer } from "./yearnDeployer";

export type SupportedEntity =
  | SupportedToken
  | SupportedContract
  | "CURVE_STECRV_POOL"
  | "TESTNET_CONVEX_MANAGER"
  | "LIDO_ORACLE";

export interface ProgressGetter {
  saveProgress: (entity: SupportedEntity, address: string) => void;
  getProgress: (entity: SupportedEntity) => string | undefined;
}

type AddressList = PartialRecord<SupportedEntity, string>;

class TestnetPlaygroundDeployer implements ProgressGetter {
  private log: Logger = new Logger({
    minLevel: "debug",
    displayFunctionName: false,
    displayLoggerName: false,
    displayFilePath: "hidden",
  });
  private verifier: Verifier = new Verifier();
  private deployer?: SignerWithAddress;
  private mainnetProvider!: providers.JsonRpcProvider;
  private contractAddresses: AddressList = {};

  public async deployMocks(): Promise<void> {
    const runtime = await setupScriptRuntime();
    this.deployer = runtime.deployer;
    this.mainnetProvider = runtime.mainnetProvider;

    if (fs.existsSync(config.progressFileName)) {
      this.log.warn("FOUND FILE WITH PREVIOUS PROGRESS!");
      const savedProgress = fs.readFileSync(config.progressFileName, {
        encoding: "utf-8",
      });

      this.contractAddresses = JSON.parse(savedProgress);
    }

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

  public saveProgress(entity: SupportedEntity, address: string): void {
    this.contractAddresses[entity] = address;
    fs.writeFileSync(
      config.progressFileName,
      JSON.stringify(this.contractAddresses)
    );
  }

  public getProgress(entity: SupportedEntity): string | undefined {
    return this.contractAddresses[entity];
  }

  public printProgress(): void {
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

const testnetPlaygroundDeployer = new TestnetPlaygroundDeployer();
testnetPlaygroundDeployer
  .deployMocks()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
