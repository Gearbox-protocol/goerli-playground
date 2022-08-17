import { deploy } from "@gearbox-protocol/devops";
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

  protected abstract run(): Promise<void>;
}
