import { TradingBot } from "../../types";
import { AbstractDeployer } from "./AbstractDeployer";

export class TradingBotDeployer extends AbstractDeployer {
  protected async run(): Promise<void> {
    await this.deploy<TradingBot>("TradingBot", this.syncer);
  }
}
