import { deploy } from "@gearbox-protocol/devops";

import { TradingBot } from "../../types";
import { AbstractDeployer } from "./AbstractDeployer";

export class TradingBotDeployer extends AbstractDeployer {
  protected async run(): Promise<void> {
    await deploy<TradingBot>("TradingBot", undefined, this.syncer);
  }
}
