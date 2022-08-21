import { TransactionReceipt } from "@ethersproject/providers";
import { deploy, waitForTransaction } from "@gearbox-protocol/devops";
import {
  MAX_INT,
  SupportedToken,
  tokenDataByNetwork,
  WETHMock__factory,
} from "@gearbox-protocol/sdk";
import { BigNumber, BigNumberish, Contract } from "ethers";

import { CVXTestnet__factory, ERC20Testnet__factory } from "../../types";
import RuntimeEnvironment from "./RuntimeEnvironment";

export abstract class AbstractScript extends RuntimeEnvironment {
  protected runtime!: RuntimeEnvironment;
  private _syncer?: string;

  public async exec(): Promise<void> {
    await this.setup();
    await this.run();
  }

  protected async setup(): Promise<void> {
    const runtime = await RuntimeEnvironment.setup();
    this.from(runtime);
    this._syncer = await this.progress.get("syncer", "address");
  }

  /**
   * Deploys contract
   * @param name
   * @param args
   * @returns
   */
  protected async deploy<T extends Contract>(
    name: string,
    ...args: any[]
  ): Promise<T> {
    return deploy(
      name,
      {
        logger: this.log,
        verifier: this.verifier,
      },
      ...args,
    );
  }

  /**
   * Approves (ERC20) transfer of MAX_INT normal tokens to some addres
   * @param token ERC20 token to call approve on
   * @param to Address to approve transfer to
   */
  protected async approve(token: SupportedToken, to: string): Promise<void> {
    this.log.debug(`Approving ${token}`);
    const tokenAddr = await this.getSupportedTokenAddress(token);
    if (!tokenAddr) {
      throw new Error(`Could not find address of ${token}`);
    }
    const contract = ERC20Testnet__factory.connect(tokenAddr, this.deployer);
    await waitForTransaction(contract.approve(to, MAX_INT));
  }

  /**
   * Mints given amount of testnet token
   * CVX is a special case, mintExact is used
   * WETH is a special case, it's deposited from deployer's balance
   * @param token symbol
   * @param to
   * @param amount
   */
  protected async mintToken(
    token: SupportedToken,
    to: string,
    amount: BigNumberish,
  ): Promise<TransactionReceipt> {
    const tokenAddr = await this.getSupportedTokenAddress(token);
    if (!tokenAddr) {
      throw new Error(`Could not find address of ${token}`);
    }
    this.log.debug(`Minting ${amount} ${token} to ${to}`);
    let tx: TransactionReceipt;
    if (token === "CVX") {
      // CVX is a special case, have to call mintExact instead and call it from syncer (deployer is syncer)
      this.log.debug("Minting CVX");
      const cvxContract = CVXTestnet__factory.connect(tokenAddr, this.deployer);
      tx = await waitForTransaction(cvxContract.mintExact(amount));
      if (to !== this.deployer.address) {
        tx = await waitForTransaction(cvxContract.transfer(to, amount));
      }
    } else if (token === "WETH") {
      const weth = WETHMock__factory.connect(tokenAddr, this.deployer);
      tx = await waitForTransaction(weth.deposit({ value: amount }));
      if (to !== this.deployer.address) {
        tx = await waitForTransaction(weth.transfer(to, amount));
      }
    } else {
      tx = await this.mintTokenByAddress(tokenAddr, to, amount);
    }
    return tx;
  }

  /**
   * Mints ERC20 token with known address
   * @param address Token address
   * @param to Receipent address
   * @param amount Token amount
   * @returns
   */
  protected async mintTokenByAddress(
    address: string,
    to: string,
    amount: BigNumberish,
  ): Promise<TransactionReceipt> {
    const contract = ERC20Testnet__factory.connect(address, this.deployer);
    const decimals = await contract.decimals();
    return waitForTransaction(
      contract.mint(to, BigNumber.from(10).pow(decimals).mul(amount)),
    );
  }

  /**
   * Returns the address of supported token on testnet
   * If it's tracked in deployment progress, takes it from there
   * Otherwise, tries to take it from @gearbox-protocol/sdk
   * @param symbol
   */
  protected async getSupportedTokenAddress(
    symbol: SupportedToken,
  ): Promise<string | undefined> {
    let addr = await this.progress.getSupportedToken(symbol);
    if (!addr) {
      addr = tokenDataByNetwork[this.network][symbol];
    }
    return addr;
  }

  protected get syncer(): string {
    if (!this._syncer) {
      throw new Error("syncer not found");
    }
    return this._syncer;
  }

  protected abstract run(): Promise<void>;
}
