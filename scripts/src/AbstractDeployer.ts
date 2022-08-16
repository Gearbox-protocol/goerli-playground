import { waitForTransaction } from "@gearbox-protocol/devops";
import { MAX_INT } from "@gearbox-protocol/sdk";
import { BigNumber } from "ethers";

import { ERC20Testnet__factory } from "../../types";
import { AbstractScript } from "./AbstractScript";
import { DeployedToken } from "./types";

export abstract class AbstractDeployer extends AbstractScript {
  // syncer address
  protected syncer!: string;

  protected override async setup(): Promise<void> {
    await super.setup();
    this.syncer = await this.progress.getOrThrow("syncer", "address");
    this.log.debug(`Syncer: ${this.syncer}`);
  }

  /**
   * Approves (ERC20) transfer of MAX_INT normal tokens to some addres
   * @param token ERC20 token to call approve on
   * @param to Address to approve transfer to
   */
  protected async approve(token: DeployedToken, to: string): Promise<void> {
    this.log.debug(`Approving ${token}`);
    const tokenAddr = await this.progress.getOrThrow("normalTokens", token);

    const contract = ERC20Testnet__factory.connect(tokenAddr, this.deployer);

    await waitForTransaction(contract.approve(to, MAX_INT));
  }

  protected async mintToken(token: DeployedToken, to: string, amount: number) {
    const tokenAddr = await this.progress.getOrThrow("normalTokens", token);
    this.log.debug(`Minting ${token}`);
    await this.mintTokenByAddress(tokenAddr, to, amount);
  }

  protected async mintTokenByAddress(
    address: string,
    to: string,
    amount: number
  ) {
    this.log.debug(`Minting ${address}`);

    const contract = ERC20Testnet__factory.connect(address, this.deployer);

    const decimals = await contract.decimals();

    await waitForTransaction(
      contract.mint(to, BigNumber.from(10).pow(decimals).mul(amount))
    );
  }
}
