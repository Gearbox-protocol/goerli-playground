import { deploy } from "@gearbox-protocol/devops";
import { run } from "hardhat";

import config from "../../config";
import { TradingBot } from "../../types";
import { AbstractDeployer } from "./AbstractDeployer";

export class TradingBotDeployer extends AbstractDeployer {
  protected async run(): Promise<void> {
    const bot = await deploy<TradingBot>("TradingBot", this.log, this.syncer);

    await bot.deployTransaction.wait(config.confirmations);

    if (this.canVerify) {
      await run("verify:verify", {
        address: bot.address,
        constructorArguments: [this.syncer],
      });
    }
  }
}
