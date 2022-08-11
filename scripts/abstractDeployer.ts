import { Verifier, waitForTransaction } from "@gearbox-protocol/devops";
import {
  MAX_INT,
  NormalToken,
  tokenDataByNetwork,
} from "@gearbox-protocol/sdk";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, providers } from "ethers";
import { Logger } from "tslog";

import config from "../config";
import { ERC20Kovan__factory } from "../types";
import { ProgressGetter, SupportedEntity } from "./mocksDeploy";

export abstract class AbstractDeployer {
  protected log: Logger;
  protected verifier: Verifier;
  protected deployer: SignerWithAddress;
  protected mainnetProvider: providers.JsonRpcProvider;
  protected progress: ProgressGetter;

  public constructor(
    log: Logger,
    verifier: Verifier,
    deployer: SignerWithAddress,
    mainnetProvider: providers.JsonRpcProvider,
    progressGetter: ProgressGetter
  ) {
    this.log = log;
    this.verifier = verifier;
    this.deployer = deployer;
    this.mainnetProvider = mainnetProvider;
    this.progress = progressGetter;
  }

  protected async approve(token: NormalToken, to: string) {
    this.log.debug(`Approving ${token}`);

    const contract = ERC20Kovan__factory.connect(
      tokenDataByNetwork[config.network][token],
      this.deployer
    );

    await waitForTransaction(contract.approve(to, MAX_INT));
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
    await this.mintTokenByAddress(
      tokenDataByNetwork[config.network][token],
      to,
      amount
    );
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

  protected saveProgress(entity: SupportedEntity, address: string) {
    this.progress.saveProgress(entity, address);
  }

  public abstract deploy(): void;
}
