// @ts-ignore
import { SignerOrProvider } from "hardhat";
import { Verifier, waitForTransaction } from "@gearbox-protocol/devops";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Logger } from "tslog";
import { ProgressGetter, SupportedEntity } from "./mocksDeploy";
import {
  MAX_INT,
  NormalToken,
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk";
import { ERC20Kovan__factory } from "../types";
import { BigNumber } from "ethers";

export abstract class AbstractDeployer {
  log: Logger;
  verifier: Verifier;
  deployer: SignerWithAddress;
  mainnetProvider: SignerOrProvider;
  progress: ProgressGetter;

  constructor(
    log: Logger,
    verifier: Verifier,
    deployer: SignerWithAddress,
    mainnetProvider: SignerOrProvider,
    progressGetter: ProgressGetter
  ) {
    this.log = log;
    this.verifier = verifier;
    this.deployer = deployer;
    this.mainnetProvider = mainnetProvider;
    this.progress = progressGetter;
  }
  abstract deploy(): void;

  protected saveProgress(entity: SupportedEntity, address: string) {
    this.progress.saveProgress(entity, address);
  }

  protected getProgress(entity: SupportedEntity): string | undefined {
    return this.progress.getProgress(entity);
  }

  protected getProgressOrThrow(entity: SupportedEntity): string {
    const result = this.progress.getProgress(entity);
    if (!result) throw new Error(`${entity} is undefined`);
    return result;
  }

  protected isDeployNeeded(entity: SupportedEntity): boolean {
    if (this.getProgress(entity)) {
      this.log.warn(
        `${entity} is already deployed at: ${this.getProgress(entity)}`
      );
      return false;
    }
    return true;
  }

  protected async mintToken(token: NormalToken, to: string, amount: number) {
    this.log.debug(`Minting ${token}`);
    await this.mintTokenByAddress(tokenDataByNetwork.Kovan[token], to, amount);
  }

  protected async mintTokenByAddress(
    address: string,
    to: string,
    amount: number
  ) {
    this.log.debug(`Minting ${address}`);

    const contract = ERC20Kovan__factory.connect(address, this.deployer);

    const decimals = await contract.decimals();

    await waitForTransaction(
      contract.mint(to, BigNumber.from(10).pow(decimals).mul(amount))
    );
  }

  protected async approve(token: NormalToken, to: string) {
    this.log.debug(`Approving ${token}`);

    const contract = ERC20Kovan__factory.connect(
      tokenDataByNetwork.Kovan[token],
      this.deployer
    );

    await waitForTransaction(contract.approve(to, MAX_INT));
  }
}
