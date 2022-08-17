import { deploy } from "@gearbox-protocol/devops";
import { SupportedToken, tokenDataByNetwork } from "@gearbox-protocol/sdk";
import { Contract } from "ethers";

import RuntimeEnvironment from "./RuntimeEnvironment";

export abstract class AbstractScript extends RuntimeEnvironment {
  protected runtime!: RuntimeEnvironment;

  public async exec(): Promise<void> {
    await this.setup();
    await this.run();
  }

  protected async setup(): Promise<void> {
    const runtime = await RuntimeEnvironment.setup();
    this.from(runtime);
  }

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

  protected abstract run(): Promise<void>;
}
